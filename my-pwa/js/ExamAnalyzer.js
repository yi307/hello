// 试卷分析函数 - 使用 DeepSeek API 分析试卷并自动分类
class ExamAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions'; // DeepSeek API 地址
        
        // 从 ExamDatabase 获取实例
        this.examDB = ExamDatabase.getInstance();
        
        // 缓存类型和标签数据
        this.questionTypes = null;
        this.questionTags = null;
        this.typeToTagsMap = null;
    }

    // 初始化数据库连接并获取类型和标签数据
    async initialize() {
        try {
            // 确保数据库已初始化
            if (!this.examDB.db) {
                console.log('正在初始化数据库...');
                await this.examDB.init();
            }
            
            // 获取所有题目类型
            this.questionTypes = await this.examDB.getAllQuestionTypes();
            console.log('获取到题目类型:', this.questionTypes.length);
            
            // 获取所有题目标签
            this.questionTags = await this.examDB.getAllTags();
            console.log('获取到题目标签:', this.questionTags.length);
            
            // 构建类型到标签的映射
            this.typeToTagsMap = {};
            for (const type of this.questionTypes) {
                const tags = await this.examDB.getTagsByTypeId(type.id);
                this.typeToTagsMap[type.id] = tags;
            }
            
            console.log('ExamAnalyzer 初始化完成');
            return true;
        } catch (error) {
            console.error('初始化失败:', error);
            throw error;
        }
    }

    // 构建用于 AI 分析的提示词
    buildAnalysisPrompt(examContent, questionTypes, questionTags) {
        // 构建类型和标签的描述
        let typeDescription = "题目类型列表：\n";
        questionTypes.forEach(type => {
            typeDescription += `- ID: ${type.id}, 名称: "${type.content}"\n`;
        });
        
        let tagDescription = "题目标签列表：\n";
        questionTags.forEach(tag => {
            typeDescription += `- ID: ${tag.id}, 名称: "${tag.content}" (所属类型ID: ${tag.type_id})\n`;
        });
        
        return `请分析以下试卷内容，为每个题目识别最合适的题目类型和标签。

${typeDescription}

${tagDescription}

分析要求：
0. 序号为中文数字的才是题目，序号为阿拉伯数字的是题目的一部分
1. 为每个题目分配一个类型ID（从上面的列表中选择最合适的）
2. 为每个题目分配一个或多个标签ID（从上面的列表中选择，必须是该类型下的标签）
3. 每个题目必须且只能有一个类型
4. 每个题目可以有0个或多个标签
5. 标签必须与类型匹配（标签的type_id必须与题目的type_id相同）

试卷内容：
"""
${examContent}
"""

请以JSON格式返回分析结果，格式如下：
{
    "questions": [
        {
            "content": "题目完整内容",
            "type_id": 数字ID,
            "tag_ids": [数字ID1, 数字ID2, ...]
        },
        // ... 更多题目
    ]
}

请确保：
1. JSON必须是有效的
2. 类型ID和标签ID必须来自上面的列表
3. 只返回JSON，不要有其他文字`;
    }

    // 调用 DeepSeek API 分析试卷
    async analyzeExamWithDeepSeek(examContent) {
        if (!this.questionTypes || !this.questionTags) {
            await this.initialize();
        }
        
        try {
            const prompt = this.buildAnalysisPrompt(examContent, this.questionTypes, this.questionTags);
            
            console.log('正在调用 DeepSeek API 分析试卷...');
            
            const response = await axios.post(
                this.apiUrl,
                {
                    model: "deepseek-chat", // 根据实际情况调整模型名称
                    messages: [
                        {
                            role: "system",
                            content: "你是一个试卷分析专家，擅长识别语文题目的类型和标签。请根据提供的类型和标签列表进行分析。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3, // 较低的温度以获得更确定的结果
                    max_tokens: 4000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const aiResponse = response.data.choices[0].message.content;
            
            // 提取 JSON 部分
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('API 返回的响应中没有找到有效的 JSON');
            }
            
            const analysisResult = JSON.parse(jsonMatch[0]);
            
            // 验证结果
            this.validateAnalysisResult(analysisResult);
            
            return analysisResult;
            
        } catch (error) {
            console.error('DeepSeek API 调用失败:', error);
            
            // 如果是 JSON 解析错误，提供更详细的信息
            if (error instanceof SyntaxError) {
                throw new Error('API 返回的 JSON 格式无效: ' + error.message);
            }
            
            // 如果是 API 错误
            if (error.response) {
                throw new Error(`API 错误: ${error.response.status} - ${error.response.data?.message || '未知错误'}`);
            }
            
            throw error;
        }
    }

    // 验证分析结果
    validateAnalysisResult(result) {
        if (!result || !result.questions || !Array.isArray(result.questions)) {
            throw new Error('分析结果格式错误：缺少 questions 数组');
        }
        
        // 验证所有类型ID和标签ID的有效性
        const validTypeIds = this.questionTypes.map(type => type.id);
        const validTagIds = this.questionTags.map(tag => tag.id);
        const tagTypeMap = {};
        
        // 构建标签到类型的映射
        this.questionTags.forEach(tag => {
            tagTypeMap[tag.id] = tag.type_id;
        });
        
        result.questions.forEach((question, index) => {
            // 检查类型ID
            if (!validTypeIds.includes(question.type_id)) {
                throw new Error(`第 ${index + 1} 个题目的类型ID ${question.type_id} 无效`);
            }
            
            // 检查标签ID
            if (question.tag_ids && Array.isArray(question.tag_ids)) {
                question.tag_ids.forEach(tagId => {
                    if (!validTagIds.includes(tagId)) {
                        throw new Error(`第 ${index + 1} 个题目的标签ID ${tagId} 无效`);
                    }
                    
                    // 检查标签是否属于该类型
                    if (tagTypeMap[tagId] !== question.type_id) {
                        const tag = this.questionTags.find(t => t.id === tagId);
                        const type = this.questionTypes.find(t => t.id === question.type_id);
                        throw new Error(`第 ${index + 1} 个题目的标签"${tag?.content}" (ID: ${tagId}) 不属于类型"${type?.content}" (ID: ${question.type_id})`);
                    }
                });
            }
        });
    }

    // 将分析结果保存到数据库
    async saveAnalysisToDatabase(examName, analysisResult, description = '') {
        try {
            // 1. 创建试卷
            const examId = await this.examDB.addExam({
                name: examName,
                description: description || `由AI分析生成的试卷 - ${new Date().toLocaleString()}`
            });
            
            console.log(`试卷创建成功，ID: ${examId}`);
            
            // 2. 保存所有题目
            const savedQuestions = [];
            
            for (const questionData of analysisResult.questions) {
                // 添加题目
                const questionId = await this.examDB.addQuestion({
                    content: questionData.content,
                    type_id: questionData.type_id,
                    exam_id: examId,
                    answer: '' // 答案可以为空，后续补充
                });
                
                console.log(`题目保存成功，ID: ${questionId}, 类型ID: ${questionData.type_id}`);
                
                // 添加标签关系
                if (questionData.tag_ids && questionData.tag_ids.length > 0) {
                    for (const tagId of questionData.tag_ids) {
                        await this.examDB.addTagToQuestion(questionId, tagId);
                    }
                    console.log(`  添加了 ${questionData.tag_ids.length} 个标签`);
                }
                
                savedQuestions.push({
                    id: questionId,
                    content: questionData.content,
                    type_id: questionData.type_id,
                    tag_ids: questionData.tag_ids || []
                });
            }
            
            return {
                examId: examId,
                questions: savedQuestions,
                totalQuestions: savedQuestions.length
            };
            
        } catch (error) {
            console.error('保存到数据库失败:', error);
            throw error;
        }
    }

    // 主函数：分析试卷并保存到数据库
    async analyzeAndSaveExam(examContent, examName, description = '') {
        try {
            // 1. 初始化
            await this.initialize();
            
            // 2. 使用 AI 分析试卷
            console.log('开始分析试卷内容...');
            const analysisResult = await this.analyzeExamWithDeepSeek(examContent);
            console.log(`分析完成，识别到 ${analysisResult.questions.length} 个题目`);
            
            // 3. 保存到数据库
            console.log('正在保存到数据库...');
            const saveResult = await this.saveAnalysisToDatabase(examName, analysisResult, description);
            
            // 4. 返回完整结果
            return {
                success: true,
                analysis: analysisResult,
                database: saveResult,
                summary: {
                    examName: examName,
                    totalQuestions: analysisResult.questions.length,
                    examId: saveResult.examId
                }
            };
            
        } catch (error) {
            console.error('试卷分析流程失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 辅助函数：获取类型和标签的详细信息
    async getTypeAndTagDetails() {
        await this.initialize();
        
        return {
            types: this.questionTypes.map(type => ({
                id: type.id,
                content: type.content,
                tags: this.typeToTagsMap[type.id] || []
            })),
            tags: this.questionTags.map(tag => ({
                id: tag.id,
                content: tag.content,
                type_id: tag.type_id
            }))
        };
    }
}

// 使用示例
async function analyzeExamExample() {
    try {
        // 1. 创建分析器实例（需要你的 DeepSeek API Key）
        const analyzer = new ExamAnalyzer('your-deepseek-api-key-here');
        
        // 2. 试卷内容（示例）
        const examContent = `
一、现代文阅读（35分）
（一）信息类文本阅读（本题共5小题，19分）
阅读下面的文字，完成1-5题。
材料一：关于人工智能的伦理思考...
1. 下列对材料相关内容的理解和分析，不正确的一项是（3分）
A. ...
B. ...
C. ...
D. ...

2. 根据材料一和材料二，下列说法不正确的一项是（3分）
A. ...
B. ...
C. ...
D. ...

（二）文学类文本阅读（本题共4小题，16分）
阅读下面的文字，完成6-9题。
《故乡》片段...
6. 下列对小说相关内容和艺术特色的分析鉴赏，不正确的一项是（3分）
A. ...
B. ...
C. ...
D. ...

7. 小说中环境描写有什么作用？请简要分析。（4分）

二、古代诗文阅读（35分）
（一）文言文阅读（本题共5小题，20分）
阅读下面的文言文，完成10-14题。
《史记·项羽本纪》片段...
10. 下列对文中画波浪线部分的断句，正确的一项是（3分）
A. ... B. ... C. ... D. ...

11. 下列对文中加点的词语及相关内容的解说，不正确的一项是（3分）
A. ... B. ... C. ... D. ...

（二）古代诗歌阅读（本题共2小题，9分）
阅读下面这首唐诗，完成15-16题。
《春望》杜甫...
15. 下列对这首诗的理解和赏析，不正确的一项是（3分）
A. ... B. ... C. ... D. ...

16. 本诗表达了诗人怎样的思想感情？请结合诗句分析。（6分）

三、语言文字运用（20分）
阅读下面的文字，完成17-19题。
...关于传统文化的传承...
17. 请在文中横线处补写恰当的语句，使整段文字语意完整连贯，内容贴切，逻辑严密，每处不超过15个字。（6分）

四、写作（60分）
22. 阅读下面的材料，根据要求写作。（60分）
"青山一道同云雨，明月何曾是两乡。"...
请结合材料，以"命运共同体"为主题，写一篇文章。
要求：选准角度，确定立意，明确文体，自拟标题；不要套作，不得抄袭；不得泄露个人信息；不少于800字。
`;
        
        // 3. 分析试卷并保存
        const result = await analyzer.analyzeAndSaveExam(
            examContent,
            '2024年高考语文模拟试卷',
            '使用AI分析生成的语文试卷'
        );
        
        if (result.success) {
            console.log('试卷分析成功！');
            console.log('试卷ID:', result.database.examId);
            console.log('题目数量:', result.summary.totalQuestions);
            
            // 显示前几个题目的分析结果
            console.log('\n前3个题目的分析结果:');
            result.analysis.questions.slice(0, 3).forEach((q, i) => {
                console.log(`题目 ${i + 1}:`);
                console.log(`  内容: ${q.content.substring(0, 50)}...`);
                console.log(`  类型ID: ${q.type_id}`);
                console.log(`  标签ID: ${q.tag_ids?.join(', ') || '无'}`);
            });
        } else {
            console.error('分析失败:', result.error);
        }
        
    } catch (error) {
        console.error('示例运行失败:', error);
    }
}

// 在实际使用中，你可能需要这样调用：
// 1. 首先确保 ExamDatabase.js 已加载
// 2. 设置你的 DeepSeek API Key
// 3. 调用 analyzeAndSaveExam 函数

// 简化版调用函数
async function quickAnalyzeExam(apiKey, examContent, examName, description = '') {
    const analyzer = new ExamAnalyzer(apiKey);
    return await analyzer.analyzeAndSaveExam(examContent, examName, description);
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExamAnalyzer, quickAnalyzeExam };
}

// 在浏览器环境中自动暴露
if (typeof window !== 'undefined') {
    window.ExamAnalyzer = ExamAnalyzer;
    window.quickAnalyzeExam = quickAnalyzeExam;
}