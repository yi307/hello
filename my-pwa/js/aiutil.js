/**
 * 语文题目分析与标签系统（数据库友好版）
 * 所有类型和标签都使用 {id, name} 结构
 */
class ChineseQuestionAnalyzer {
  constructor() {
    // 数据库格式的题目类型（id从1001开始）
    this.questionTypes = [
      { id: 1001, name: "信息类阅读" },
      { id: 1002, name: "文学类阅读·小说" },
      { id: 1003, name: "文学类阅读·散文" },
      { id: 1004, name: "文学类阅读·新诗与戏剧" },
      { id: 1005, name: "文言文阅读" },
      { id: 1006, name: "古诗阅读与鉴赏" },
      { id: 1008, name: "语言基础" },
      { id: 1009, name: "语言表达" },
      { id: 1010, name: "整本书阅读" },
      { id: 1011, name: "写作" }
    ];
    
    // 数据库格式的标签映射（typeId -> [{id, name}, ...]）
    this.typeToTags = {
      // 1001: 信息类阅读
      1001: [
        { id: 2001, name: "理解推断信息" },
        { id: 2002, name: "分析理据关系与图文关系" },
        { id: 2003, name: "分析论证特色" },
        { id: 2004, name: "分析实用类文本特色" },
        { id: 2005, name: "概括与比较要点" },
        { id: 2006, name: "迁移运用观点" }
      ],
      // 1002: 文学类阅读·小说
      1002: [
        { id: 2007, name: "分析故事情节" },
        { id: 2008, name: "分析叙事特征" },
        { id: 2009, name: "分析环境描写" },
        { id: 2010, name: "分析概括人物特点" },
        { id: 2011, name: "分析形象作用" },
        { id: 2012, name: "分析文本特征" },
        { id: 2013, name: "赏析艺术技巧，分析主旨意蕴" }
      ],
      // 1003: 文学类阅读·散文
      1003: [
        { id: 2014, name: "分析思路结构" },
        { id: 2015, name: "概括内容形象" },
        { id: 2016, name: "理解赏析词句" },
        { id: 2017, name: "赏析技巧语言" },
        { id: 2018, name: "分析主旨意蕴" },
        { id: 2019, name: "文学短评" },
        { id: 2020, name: "札记评点" }
      ],
      // 1004: 文学类阅读·新诗与戏剧
      1004: [
        { id: 2021, name: "新诗阅读与鉴赏" },
        { id: 2022, name: "戏剧阅读与鉴赏" }
      ],
      // 1005: 文言文阅读
      1005: [
        { id: 2023, name: "教材文言文复习" },
        { id: 2024, name: "理解文言实词" },
        { id: 2025, name: "理解文言虚词" },
        { id: 2026, name: "识记文化常识" },
        { id: 2027, name: "精准断开句读" },
        { id: 2028, name: "精准翻译语句" },
        { id: 2029, name: "精准概括文意" }
      ],
      // 1006: 古诗阅读与鉴赏
      1006: [
        { id: 2030, name: "理解概括思想内容" },
        { id: 2031, name: "把握情感内涵" },
        { id: 2032, name: "赏析物象与人物形象" },
        { id: 2033, name: "赏析意象(景象)与意境" },
        { id: 2034, name: "赏析语言之语言风格" },
        { id: 2035, name: "赏析表达技巧" }
      ],
      // 1008: 语言基础
      1008: [
        { id: 2036, name: "正确理解运用实词虚词" },
        { id: 2037, name: "正确使用成语" },
        { id: 2038, name: "辨析并修改病句" },
        { id: 2039, name: "正确使用标点符号" }
      ],
      // 1009: 语言表达
      1009: [
        { id: 2040, name: "语句衔接" },
        { id: 2041, name: "语句补写" },
        { id: 2042, name: "分析修辞手法构成及表达效果" },
        { id: 2043, name: "赏析词语和句子表达效果" },
        { id: 2044, name: "句式变换与句式仿写" },
        { id: 2045, name: "语段压缩" },
        { id: 2046, name: "语言简明、得体、准确、鲜明、生动" }
      ],
      // 1010: 整本书阅读
      1010: [
        { id: 2047, name: "《乡土中国》阅读" },
        { id: 2048, name: "《红楼梦》阅读" }
      ],
      // 1011: 写作
      1011: [
        { id: 2049, name: "关系类作文" },
        { id: 2050, name: "情境任务作文" },
        { id: 2051, name: "问题类作文" },
        { id: 2052, name: "主题作文" },
        { id: 2053, name: "漫画作文" },
        { id: 2054, name: "名句类作文" }
      ]
    };
    
    // AI配置
    this.aiConfig = {
      apiKey: '',
      apiUrl: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-chat',
      temperature: 0.1,
      maxTokens: 1000
    };
    
    // 缓存
    this.cache = new Map();
    
    // 创建ID查找映射（提升性能）
    this._createLookupMaps();
  }
  
  /**
   * 创建ID到对象的查找映射
   * @private
   */
  _createLookupMaps() {
    // 类型ID到类型对象的映射
    this.typeIdMap = {};
    this.questionTypes.forEach(type => {
      this.typeIdMap[type.id] = type;
    });
    
    // 标签ID到标签对象的映射
    this.tagIdMap = {};
    Object.values(this.typeToTags).forEach(tagList => {
      tagList.forEach(tag => {
        this.tagIdMap[tag.id] = tag;
      });
    });
    
    // 类型名称到类型ID的映射（用于AI返回的名称查找）
    this.typeNameToId = {};
    this.questionTypes.forEach(type => {
      // 处理可能的名称变体
      const nameVariants = [
        type.name,
        `（${type.name}）`,  // 带括号的
        `(${type.name})`    // 英文括号
      ];
      nameVariants.forEach(variant => {
        this.typeNameToId[variant] = type.id;
      });
    });
  }
  
  /**
   * 使用AI分析题目并返回分类和标签（数据库友好格式）
   * @param {string} questionText - 题目文本
   * @param {number} maxTags - 最多返回几个标签（默认3）
   * @returns {Promise<Object>} 分析结果，格式：
   * {
   *   question: string,
   *   type: { id: number, name: string },
   *   tags: Array<{ id: number, name: string }>,
   *   confidence: number,
   *   reason: string,
   *   timestamp: string,
   *   isFallback?: boolean,
   *   isFromCache?: boolean,
   *   error?: string
   * }
   */
  async analyzeQuestion(questionText, maxTags = 3) {
    // 1. 检查缓存
    const cacheKey = `${questionText}_${maxTags}`;
    if (this.cache.has(cacheKey)) {
      console.log('从缓存返回结果');
      const cachedResult = this.cache.get(cacheKey);
      return { ...cachedResult, isFromCache: true };
    }
    
    // 2. 参数验证
    if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
      throw new Error('questionText必须是有效的非空字符串');
    }
    
    if (maxTags < 1 || maxTags > 10) {
      console.warn(`maxTags=${maxTags}超出建议范围(1-10)，已调整为3`);
      maxTags = 3;
    }
    
    // 3. 构建AI提示词
    const prompt = this._buildClassificationPrompt(questionText, maxTags);
    
    try {
      // 4. 调用AI API
      const aiResponse = await this._callAI(prompt);
      
      // 5. 解析AI返回的JSON（转换为数据库格式）
      const result = this._parseAIResponse(aiResponse, questionText, maxTags);
      
      // 6. 缓存结果
      const resultToCache = { ...result };
      this.cache.set(cacheKey, resultToCache);
      
      return result;
      
    } catch (error) {
      console.error('AI分析失败:', error);
      // 返回包含错误信息的fallback结果
      const fallbackResult = this._getFallbackResult(questionText, maxTags);
      return {
        ...fallbackResult,
        error: error.message,
        errorType: error.name,
        isFallback: true
      };
    }
  }
  
  /**
   * 构建分类提示词（内部方法）
   * @private
   */
_buildClassificationPrompt(questionText, maxTags) {
  const typeListText = this.questionTypes.map(type => 
    `  ID ${type.id}: ${type.name}`
  ).join('\n');
  
  const tagLibraryText = Object.entries(this.typeToTags)
    .map(([typeId, tags]) => {
      const type = this.typeIdMap[typeId];
      // ✨ 关键：明确显示ID和名称的对应关系
      const tagDetails = tags.map(tag => `[ID:${tag.id}] ${tag.name}`).join(' | ');
      return `类型 ${typeId} (${type.name}):\n    可选标签: ${tagDetails}`;
    })
    .join('\n\n');
  
  return `你是一个语文教育专家。请分析以下语文题目：

【题目】
${questionText}

【严格规则 - 必须遵守】：
1. 标签ID必须使用下面标签库中指定的【数字ID】，如2030、2031等
2. 绝对不要创建新ID（如6001、6002等）
3. 标签ID和名称必须一一对应，不要混淆

【标签库 - 注意ID和名称的对应关系】
${tagLibraryText}

【错误示例 - 禁止这样做】：
{
  "tagIds": [6001, 6002, 6006],  // ❌ 错误！使用了自创的ID
  "tagNames": ["理解概括思想内容", "把握情感内涵", "赏析表达技巧"]
}

【正确示例 - 请这样做】：
{
  "tagIds": [2030, 2031, 2035],  // ✅ 正确！使用了标签库中的ID
  "tagNames": ["理解概括思想内容", "把握情感内涵", "赏析表达技巧"]
}

【输出要求】
请以严格的JSON格式返回，必须包含以下字段：
- "typeId": 类型ID（必须从上述类型ID中选择，如1006）
- "typeName": 类型名称
- "tagIds": 标签ID数组（最多${maxTags}个，必须使用标签库中的数字ID）
- "tagNames": 标签名称数组（必须与tagIds一一对应）
- "confidence": 置信度（0-1的小数）
- "reason": 分析理由

请分析上述题目并返回JSON：`;
}
  
  /**
   * 调用AI API（内部方法）
   * @private
   */
  async _callAI(prompt) {
    if (!this.aiConfig.apiKey) {
      throw new Error('请先设置API Key: analyzer.setApiKey("your-key")');
    }
    
    const response = await axios.post(this.aiConfig.apiUrl, {
      model: this.aiConfig.model,
      messages: [{ role: "user", content: prompt }],
      temperature: this.aiConfig.temperature,
      max_tokens: this.aiConfig.maxTokens,
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Authorization': `Bearer ${this.aiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    return response.data.choices[0].message.content;
  }
  
  /**
   * 解析AI响应并转换为数据库格式（内部方法）
   * @private
   */
  _parseAIResponse(aiResponse, originalQuestion, maxTags) {
    try {
      const aiResult = JSON.parse(aiResponse);
      
      // 验证必需字段
      if (!aiResult.typeId || !aiResult.tagIds) {
        throw new Error('AI返回缺少必需字段: typeId或tagIds');
      }
      
      // 标准化类型ID
      const typeId = parseInt(aiResult.typeId);
      const type = this.typeIdMap[typeId];
      
      if (!type) {
        throw new Error(`无效的类型ID: ${typeId}`);
      }
      
      // 处理标签IDs
      let tagIds = aiResult.tagIds;
      if (!Array.isArray(tagIds)) {
        tagIds = [tagIds];
      }
      
      // 转换为数字并去重
      tagIds = [...new Set(tagIds.map(id => parseInt(id)))];
      
      // 获取标签对象数组
      const tags = tagIds
        .map(tagId => this.tagIdMap[tagId])
        .filter(tag => tag) // 过滤掉无效的tagId
        .slice(0, maxTags); // 限制数量
      
      if (tags.length === 0) {
        throw new Error('无法找到有效的标签ID');
      }
      
      // 构建结果对象（数据库友好格式）
      const result = {
        question: originalQuestion,
        type: {
          id: type.id,
          name: type.name
        },
        tags: tags.map(tag => ({
          id: tag.id,
          name: tag.name
        })),
        confidence: this._normalizeConfidence(aiResult.confidence),
        reason: aiResult.reason || '',
        timestamp: new Date().toISOString()
      };
      
      return result;
      
    } catch (error) {
      console.error('解析AI响应失败:', error, '原始响应:', aiResponse);
      throw new Error(`解析失败: ${error.message}`);
    }
  }
  
  /**
   * 标准化置信度（内部方法）
   * @private
   */
  _normalizeConfidence(confidence) {
    if (confidence === undefined || confidence === null) {
      return 0.5;
    }
    
    const num = parseFloat(confidence);
    if (isNaN(num)) {
      return 0.5;
    }
    
    // 限制在0-1之间
    return Math.max(0, Math.min(1, num));
  }
  
  /**
   * AI失败时的备用结果（内部方法）
   * @private
   */
  _getFallbackResult(questionText, maxTags) {
    // 基于简单规则猜测类型
    const lowerText = questionText.toLowerCase();
    let guessedType = this.questionTypes[0]; // 默认第一个类型
    
    if (lowerText.includes('文言') || lowerText.includes('古文中')) {
      guessedType = this.typeIdMap[1005];
    } else if (lowerText.includes('古诗') || lowerText.includes('诗歌')) {
      guessedType = this.typeIdMap[1006];
    } else if (lowerText.includes('作文') || lowerText.includes('写作')) {
      guessedType = this.typeIdMap[1011];
    } else if (lowerText.includes('小说')) {
      guessedType = this.typeIdMap[1002];
    } else if (lowerText.includes('散文')) {
      guessedType = this.typeIdMap[1003];
    } else if (lowerText.includes('新诗') || lowerText.includes('戏剧')) {
      guessedType = this.typeIdMap[1004];
    } else if (lowerText.includes('语言基础') || lowerText.includes('病句')) {
      guessedType = this.typeIdMap[1008];
    } else if (lowerText.includes('语言表达') || lowerText.includes('修辞')) {
      guessedType = this.typeIdMap[1009];
    } else if (lowerText.includes('乡土中国') || lowerText.includes('红楼梦')) {
      guessedType = this.typeIdMap[1010];
    }
    
    // 获取对应类型的标签
    const availableTags = this.typeToTags[guessedType.id] || [];
    const selectedTags = availableTags.slice(0, maxTags);
    
    return {
      question: questionText,
      type: {
        id: guessedType.id,
        name: guessedType.name
      },
      tags: selectedTags.map(tag => ({
        id: tag.id,
        name: tag.name
      })),
      confidence: 0.3,
      reason: 'AI分析失败，使用规则猜测',
      timestamp: new Date().toISOString(),
      isFallback: true
    };
  }
  
  // ========== 公开API方法 ==========
  
  /**
   * 设置API Key
   * @param {string} apiKey - DeepSeek API Key
   * @returns {ChineseQuestionAnalyzer} 支持链式调用
   */
  setApiKey(apiKey) {
    this.aiConfig.apiKey = apiKey;
    return this;
  }
  
  /**
   * 添加新的题目类型
   * @param {number} id - 类型ID（建议从1100开始）
   * @param {string} name - 类型名称
   * @param {Array<{id: number, name: string}>} tags - 标签数组
   * @returns {ChineseQuestionAnalyzer} 支持链式调用
   */
  addQuestionType(id, name, tags = []) {
    const newType = { id, name };
    this.questionTypes.push(newType);
    this.typeToTags[id] = tags;
    
    // 更新查找映射
    this._createLookupMaps();
    
    return this;
  }
  
  /**
   * 修改现有类型的标签
   * @param {number} typeId - 类型ID
   * @param {Array<{id: number, name: string}>} newTags - 新的标签数组
   * @returns {ChineseQuestionAnalyzer} 支持链式调用
   */
  updateTypeTags(typeId, newTags) {
    if (this.typeToTags[typeId]) {
      this.typeToTags[typeId] = newTags;
      this._createLookupMaps();
    }
    return this;
  }
  
  /**
   * 根据ID获取类型信息
   * @param {number} typeId - 类型ID
   * @returns {{id: number, name: string} | undefined}
   */
  getTypeById(typeId) {
    return this.typeIdMap[typeId];
  }
  
  /**
   * 根据ID获取标签信息
   * @param {number} tagId - 标签ID
   * @returns {{id: number, name: string} | undefined}
   */
  getTagById(tagId) {
    return this.tagIdMap[tagId];
  }
  
  /**
   * 获取所有类型（数据库格式）
   * @returns {Array<{id: number, name: string}>}
   */
  getAllTypes() {
    return [...this.questionTypes];
  }
  
  /**
   * 获取指定类型的所有标签
   * @param {number} typeId - 类型ID
   * @returns {Array<{id: number, name: string}>}
   */
  getTagsByType(typeId) {
    return this.typeToTags[typeId] || [];
  }
  
  /**
   * 批量分析题目
   * @param {Array<string>} questionTexts - 题目数组
   * @param {number} maxTags - 最多返回几个标签
   * @returns {Promise<Object>} 批量结果
   */
  async analyzeQuestionsBatch(questionTexts, maxTags = 3) {
    const results = [];
    
    for (const text of questionTexts) {
      try {
        const result = await this.analyzeQuestion(text, maxTags);
        results.push(result);
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.push({
          question: text,
          error: error.message,
          isError: true
        });
      }
    }
    
    return {
      total: questionTexts.length,
      success: results.filter(r => !r.error).length,
      results: results
    };
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
    return this;
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    return {
      totalTypes: this.questionTypes.length,
      totalTags: Object.values(this.typeToTags).flat().length,
      cacheSize: this.cache.size,
      typeDistribution: this.questionTypes.reduce((dist, type) => {
        dist[type.name] = (this.typeToTags[type.id] || []).length;
        return dist;
      }, {})
    };
  }
  
  /**
   * 导出结果为数据库插入语句
   * @param {Array<Object>} results - 分析结果数组
   * @returns {Object} 包含SQL语句的对象
   */
  exportToSQL(results) {
    const validResults = results.filter(r => !r.error && !r.isError);
    
    // 生成题目表插入语句
    const questionInserts = validResults.map(result => {
      const tagsJson = JSON.stringify(result.tags);
      return `INSERT INTO questions (question_text, type_id, type_name, tags_json, confidence, reason, created_at) 
              VALUES ('${result.question.replace(/'/g, "''")}', ${result.type.id}, '${result.type.name}', '${tagsJson}', ${result.confidence}, '${result.reason.replace(/'/g, "''")}', '${result.timestamp}');`;
    }).join('\n');
    
    // 生成类型统计语句
    const typeStats = validResults.reduce((stats, result) => {
      stats[result.type.id] = (stats[result.type.id] || 0) + 1;
      return stats;
    }, {});
    
    const statsInserts = Object.entries(typeStats).map(([typeId, count]) => {
      return `INSERT INTO type_statistics (type_id, question_count) VALUES (${typeId}, ${count});`;
    }).join('\n');
    
    return {
      questionSQL: questionInserts,
      statisticsSQL: statsInserts,
      totalQuestions: validResults.length,
      totalTypes: Object.keys(typeStats).length
    };
  }
  
  /**
   * 从数据库结果恢复分析器状态
   * @param {Object} dbData - 数据库数据
   * @returns {ChineseQuestionAnalyzer} 支持链式调用
   */
  loadFromDatabase(dbData) {
    if (dbData.types) {
      this.questionTypes = dbData.types;
    }
    
    if (dbData.typeToTags) {
      this.typeToTags = dbData.typeToTags;
    }
    
    if (dbData.cachedResults) {
      dbData.cachedResults.forEach(result => {
        const cacheKey = `${result.question}_${result.tags.length}`;
        this.cache.set(cacheKey, result);
      });
    }
    
    this._createLookupMaps();
    return this;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChineseQuestionAnalyzer;

}
