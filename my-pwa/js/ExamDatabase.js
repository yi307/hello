// ExamDatabase.js - 修复事务和错误处理
class ExamDatabase {
    static instance = null;
    
    constructor() {
        if (ExamDatabase.instance) {
            return ExamDatabase.instance;
        }
        
        this.db = null;
        this.dbName = 'ExamDatabase';
        this.dbVersion = 1;
        ExamDatabase.instance = this;
    }
    
    static getInstance() {
        if (!ExamDatabase.instance) {
            ExamDatabase.instance = new ExamDatabase();
        }
        return ExamDatabase.instance;
    }
    
    // 初始化数据库
// 初始化数据库
init() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = (event) => {
            console.error('IndexedDB 初始化失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('ExamDatabase 初始化成功');
            resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 1. 创建题目类型表
            if (!db.objectStoreNames.contains('question_types')) {
                const typeStore = db.createObjectStore('question_types', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                typeStore.createIndex('content_idx', 'content', { unique: true });
            }
            
            // 2. 创建试卷表
            if (!db.objectStoreNames.contains('exams')) {
                const examStore = db.createObjectStore('exams', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                examStore.createIndex('name_idx', 'name', { unique: false });
            }
            
            // 3. 创建题目表
            if (!db.objectStoreNames.contains('questions')) {
                const questionStore = db.createObjectStore('questions', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                questionStore.createIndex('type_id_idx', 'type_id', { unique: false });
                questionStore.createIndex('exam_id_idx', 'exam_id', { unique: false });
            }
            
            // 4. 创建题目标签表
            if (!db.objectStoreNames.contains('question_tags')) {
                const tagStore = db.createObjectStore('question_tags', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                tagStore.createIndex('type_id_idx', 'type_id', { unique: false });
                tagStore.createIndex('content_idx', 'content', { unique: true });
            }
            
            // 5. 创建题目-标签关系表（多对多）
            if (!db.objectStoreNames.contains('question_tag_relations')) {
                const relationStore = db.createObjectStore('question_tag_relations', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                relationStore.createIndex('question_id_idx', 'question_id', { unique: false });
                relationStore.createIndex('tag_id_idx', 'tag_id', { unique: false });
                // 复合索引确保唯一关系
                relationStore.createIndex('question_tag_idx', ['question_id', 'tag_id'], { unique: true });
            }
            
            console.log('数据库表结构创建完成');
            
            // 初始化完成后，添加预定义数据
            const transaction = event.target.transaction;
            transaction.oncomplete = async () => {
                console.log('开始初始化预定义数据...');
                
                try {
                    await this.initializePredefinedData(db);
                } catch (error) {
                    console.error('初始化预定义数据失败:', error);
                }
            };
        };
    });
}

// 新增方法：初始化预定义数据
async initializePredefinedData(db) {
    // 题目类型数据
    const questionTypes = [
        { id: 1001, content: "信息类阅读" },
        { id: 1002, content: "文学类阅读·小说" },
        { id: 1003, content: "文学类阅读·散文" },
        { id: 1004, content: "文学类阅读·新诗与戏剧" },
        { id: 1005, content: "文言文阅读" },
        { id: 1006, content: "古诗阅读与鉴赏" },
        { id: 1008, content: "语言基础" },
        { id: 1009, content: "语言表达" },
        { id: 1010, content: "整本书阅读" },
        { id: 1011, content: "写作" }
    ];
    
    // 题目标签数据
    const typeToTags = {
        // 1001: 信息类阅读
        1001: [
            { id: 2001, content: "理解推断信息", type_id: 1001 },
            { id: 2002, content: "分析理据关系与图文关系", type_id: 1001 },
            { id: 2003, content: "分析论证特色", type_id: 1001 },
            { id: 2004, content: "分析实用类文本特色", type_id: 1001 },
            { id: 2005, content: "概括与比较要点", type_id: 1001 },
            { id: 2006, content: "迁移运用观点", type_id: 1001 }
        ],
        // 1002: 文学类阅读·小说
        1002: [
            { id: 2007, content: "分析故事情节", type_id: 1002 },
            { id: 2008, content: "分析叙事特征", type_id: 1002 },
            { id: 2009, content: "分析环境描写", type_id: 1002 },
            { id: 2010, content: "分析概括人物特点", type_id: 1002 },
            { id: 2011, content: "分析形象作用", type_id: 1002 },
            { id: 2012, content: "分析文本特征", type_id: 1002 },
            { id: 2013, content: "赏析艺术技巧，分析主旨意蕴", type_id: 1002 }
        ],
        // 1003: 文学类阅读·散文
        1003: [
            { id: 2014, content: "分析思路结构", type_id: 1003 },
            { id: 2015, content: "概括内容形象", type_id: 1003 },
            { id: 2016, content: "理解赏析词句", type_id: 1003 },
            { id: 2017, content: "赏析技巧语言", type_id: 1003 },
            { id: 2018, content: "分析主旨意蕴", type_id: 1003 },
            { id: 2019, content: "文学短评", type_id: 1003 },
            { id: 2020, content: "札记评点", type_id: 1003 }
        ],
        // 1004: 文学类阅读·新诗与戏剧
        1004: [
            { id: 2021, content: "新诗阅读与鉴赏", type_id: 1004 },
            { id: 2022, content: "戏剧阅读与鉴赏", type_id: 1004 }
        ],
        // 1005: 文言文阅读
        1005: [
            { id: 2023, content: "教材文言文复习", type_id: 1005 },
            { id: 2024, content: "理解文言实词", type_id: 1005 },
            { id: 2025, content: "理解文言虚词", type_id: 1005 },
            { id: 2026, content: "识记文化常识", type_id: 1005 },
            { id: 2027, content: "精准断开句读", type_id: 1005 },
            { id: 2028, content: "精准翻译语句", type_id: 1005 },
            { id: 2029, content: "精准概括文意", type_id: 1005 }
        ],
        // 1006: 古诗阅读与鉴赏
        1006: [
            { id: 2030, content: "理解概括思想内容", type_id: 1006 },
            { id: 2031, content: "把握情感内涵", type_id: 1006 },
            { id: 2032, content: "赏析物象与人物形象", type_id: 1006 },
            { id: 2033, content: "赏析意象(景象)与意境", type_id: 1006 },
            { id: 2034, content: "赏析语言之语言风格", type_id: 1006 },
            { id: 2035, content: "赏析表达技巧", type_id: 1006 }
        ],
        // 1008: 语言基础
        1008: [
            { id: 2036, content: "正确理解运用实词虚词", type_id: 1008 },
            { id: 2037, content: "正确使用成语", type_id: 1008 },
            { id: 2038, content: "辨析并修改病句", type_id: 1008 },
            { id: 2039, content: "正确使用标点符号", type_id: 1008 }
        ],
        // 1009: 语言表达
        1009: [
            { id: 2040, content: "语句衔接", type_id: 1009 },
            { id: 2041, content: "语句补写", type_id: 1009 },
            { id: 2042, content: "分析修辞手法构成及表达效果", type_id: 1009 },
            { id: 2043, content: "赏析词语和句子表达效果", type_id: 1009 },
            { id: 2044, content: "句式变换与句式仿写", type_id: 1009 },
            { id: 2045, content: "语段压缩", type_id: 1009 },
            { id: 2046, content: "语言简明、得体、准确、鲜明、生动", type_id: 1009 }
        ],
        // 1010: 整本书阅读
        1010: [
            { id: 2047, content: "《乡土中国》阅读", type_id: 1010 },
            { id: 2048, content: "《红楼梦》阅读", type_id: 1010 }
        ],
        // 1011: 写作
        1011: [
            { id: 2049, content: "关系类作文", type_id: 1011 },
            { id: 2050, content: "情境任务作文", type_id: 1011 },
            { id: 2051, content: "问题类作文", type_id: 1011 },
            { id: 2052, content: "主题作文", type_id: 1011 },
            { id: 2053, content: "漫画作文", type_id: 1011 },
            { id: 2054, content: "名句类作文", type_id: 1011 }
        ]
    };
    
    // 使用回调函数风格的Promise包装器
    const executeOperation = (storeName, mode, operation) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
            
            operation(store);
        });
    };
    
    // 清空现有数据（避免重复添加）
    console.log('清空现有类型和标签数据...');
    await executeOperation('question_types', 'readwrite', (store) => store.clear());
    await executeOperation('question_tags', 'readwrite', (store) => store.clear());
    
    // 添加题目类型
    console.log('添加题目类型数据...');
    for (const type of questionTypes) {
        await executeOperation('question_types', 'readwrite', (store) => {
            store.put({
                id: type.id,
                content: type.content,
                created_at: new Date().toISOString()
            });
        });
    }
    console.log(`已添加 ${questionTypes.length} 个题目类型`);
    
    // 添加题目标签
    console.log('添加题目标签数据...');
    let totalTags = 0;
    
    for (const [typeId, tags] of Object.entries(typeToTags)) {
        for (const tag of tags) {
            await executeOperation('question_tags', 'readwrite', (store) => {
                store.put({
                    id: tag.id,
                    content: tag.content,
                    type_id: parseInt(typeId),
                    created_at: new Date().toISOString()
                });
            });
            totalTags++;
        }
    }
    
    console.log(`已添加 ${totalTags} 个题目标签`);
    console.log('预定义数据初始化完成');
}
    
    // ---------- 试卷相关操作 ----------
    async addExam(exam) {
        return this.executeTransaction('exams', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add({
                    name: exam.name,
                    description: exam.description || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getExam(id) {
        return this.executeTransaction('exams', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getAllExams() {
        return this.executeTransaction('exams', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // 新增：根据名字模糊匹配试卷
    async searchExamsByName(keyword) {
        if (!keyword || keyword.trim() === '') {
            return this.getAllExams();
        }
        
        const searchTerm = keyword.toLowerCase().trim();
        
        return this.executeTransaction('exams', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.openCursor();
                const results = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const exam = cursor.value;
                        // 在名称和描述中搜索
                        const nameMatch = exam.name && exam.name.toLowerCase().includes(searchTerm);
                        const descMatch = exam.description && exam.description.toLowerCase().includes(searchTerm);
                        
                        if (nameMatch || descMatch) {
                            results.push(exam);
                        }
                        cursor.continue();
                    } else {
                        // 按相关性排序（名称匹配优先）
                        results.sort((a, b) => {
                            const aNameMatch = a.name && a.name.toLowerCase().includes(searchTerm);
                            const bNameMatch = b.name && b.name.toLowerCase().includes(searchTerm);
                            
                            if (aNameMatch && !bNameMatch) return -1;
                            if (!aNameMatch && bNameMatch) return 1;
                            return 0;
                        });
                        resolve(results);
                    }
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        });
    }

    async updateExam(id, examData) {
        // 注意：这里需要在一个事务内完成查询和更新
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['exams'], 'readwrite');
            const store = transaction.objectStore('exams');
            
            // 先查询
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const exam = getRequest.result;
                if (!exam) {
                    reject(new Error('试卷不存在'));
                    return;
                }
                
                // 再更新
                const updatedExam = {
                    ...exam,
                    ...examData,
                    updated_at: new Date().toISOString()
                };
                
                const putRequest = store.put(updatedExam);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = (event) => reject(event.target.error);
            };
            
            getRequest.onerror = (event) => reject(event.target.error);
            transaction.onerror = (event) => reject(event.target.error);
        });
    }
    
    async deleteExam(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(
                ['exams', 'questions', 'question_tag_relations'], 
                'readwrite'
            );
            
            let hasError = false;
            
            transaction.onerror = (event) => {
                if (!hasError) {
                    hasError = true;
                    console.error('删除试卷事务失败:', event.target.error);
                    reject(event.target.error);
                }
            };
            
            transaction.oncomplete = () => {
                if (!hasError) {
                    console.log(`试卷 ${id} 删除成功`);
                    resolve(true);
                }
            };
            
            const examStore = transaction.objectStore('exams');
            const questionStore = transaction.objectStore('questions');
            const relationStore = transaction.objectStore('question_tag_relations');
            
            // 1. 先删除试卷
            const deleteExamRequest = examStore.delete(id);
            
            deleteExamRequest.onerror = (event) => {
                if (!hasError) {
                    hasError = true;
                    console.error('删除试卷失败:', event.target.error);
                    reject(event.target.error);
                }
            };
            
            // 2. 删除该试卷的所有题目及其关系
            const questionIndex = questionStore.index('exam_id_idx');
            const getQuestionsRequest = questionIndex.getAll(id);
            
            getQuestionsRequest.onsuccess = (event) => {
                const questions = event.target.result;
                
                if (questions.length === 0) {
                    // 如果没有题目，事务会正常完成
                    return;
                }
                
                let completedDeletions = 0;
                const totalToDelete = questions.length;
                
                const checkComplete = () => {
                    completedDeletions++;
                    if (completedDeletions === totalToDelete) {
                        // 所有题目和关系都已删除
                        console.log(`删除了 ${questions.length} 个相关题目`);
                    }
                };
                
                // 为每个题目删除其关系
                questions.forEach(question => {
                    // 删除题目
                    const deleteQuestionRequest = questionStore.delete(question.id);
                    
                    deleteQuestionRequest.onerror = (event) => {
                        if (!hasError) {
                            hasError = true;
                            console.error(`删除题目 ${question.id} 失败:`, event.target.error);
                            reject(event.target.error);
                        }
                    };
                    
                    deleteQuestionRequest.onsuccess = () => {
                        // 删除该题目的所有标签关系
                        const relationIndex = relationStore.index('question_id_idx');
                        const getRelationsRequest = relationIndex.getAll(question.id);
                        
                        getRelationsRequest.onsuccess = (relationEvent) => {
                            const relations = relationEvent.target.result;
                            
                            if (relations.length === 0) {
                                checkComplete();
                                return;
                            }
                            
                            let relationDeletions = 0;
                            const totalRelations = relations.length;
                            
                            const checkRelationComplete = () => {
                                relationDeletions++;
                                if (relationDeletions === totalRelations) {
                                    checkComplete();
                                }
                            };
                            
                            relations.forEach(relation => {
                                const deleteRelationRequest = relationStore.delete(relation.id);
                                
                                deleteRelationRequest.onerror = (deleteEvent) => {
                                    if (!hasError) {
                                        hasError = true;
                                        console.error(`删除关系 ${relation.id} 失败:`, deleteEvent.target.error);
                                        reject(deleteEvent.target.error);
                                    }
                                };
                                
                                deleteRelationRequest.onsuccess = () => {
                                    checkRelationComplete();
                                };
                            });
                        };
                        
                        getRelationsRequest.onerror = (relationEvent) => {
                            if (!hasError) {
                                hasError = true;
                                console.error(`查询关系失败:`, relationEvent.target.error);
                                reject(relationEvent.target.error);
                            }
                        };
                    };
                });
            };
            
            getQuestionsRequest.onerror = (event) => {
                if (!hasError) {
                    hasError = true;
                    console.error('查询试卷题目失败:', event.target.error);
                    reject(event.target.error);
                }
            };
        });
    }
    
    // 辅助方法：查询题目的所有关系
    async getRelationsByQuestionId(questionId) {
        return this.executeTransaction('question_tag_relations', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('question_id_idx');
                const request = index.getAll(questionId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // ---------- 题目类型相关操作 ----------
    async addQuestionType(content) {
        return this.executeTransaction('question_types', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add({
                    content: content,
                    created_at: new Date().toISOString()
                });
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    // ---------- 新增：根据ID更新题目类型 ----------
    async updateQuestionType(id, newContent) {
        if (!newContent || newContent.trim() === '') {
            throw new Error('题目类型内容不能为空');
        }
        
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['question_types'], 'readwrite');
            const store = transaction.objectStore('question_types');
            
            // 先查询是否存在
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const questionType = getRequest.result;
                if (!questionType) {
                    reject(new Error(`题目类型ID ${id} 不存在`));
                    return;
                }
                
                // 检查新名称是否与其他类型冲突
                const index = store.index('content_idx');
                const checkRequest = index.get(newContent);
                
                checkRequest.onsuccess = () => {
                    const existingType = checkRequest.result;
                    if (existingType && existingType.id !== id) {
                        reject(new Error(`题目类型名称 "${newContent}" 已存在`));
                        return;
                    }
                    
                    // 更新题目类型
                    const updatedType = {
                        ...questionType,
                        content: newContent,
                        updated_at: new Date().toISOString() // 添加更新时间
                    };
                    
                    const putRequest = store.put(updatedType);
                    
                    putRequest.onsuccess = () => {
                        console.log(`题目类型 ${id} 更新成功: "${questionType.content}" -> "${newContent}"`);
                        
                        // 可选：更新相关题目的缓存或触发更新
                        this.clearSearchCache(); // 清除搜索缓存
                        
                        resolve(putRequest.result);
                    };
                    
                    putRequest.onerror = (event) => {
                        reject(event.target.error);
                    };
                };
                
                checkRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                reject(event.target.error);
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    async getAllQuestionTypes() {
        return this.executeTransaction('question_types', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    // ---------- 新增：删除题目类型 ----------
    async deleteQuestionType(typeId) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            try {
                // 1. 检查类型是否存在
                const questionType = await this.executeTransaction('question_types', 'readonly', (store) => {
                    return new Promise((resolve, reject) => {
                        const request = store.get(typeId);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = (event) => reject(event.target.error);
                    });
                });
                
                if (!questionType) {
                    reject(new Error(`题目类型ID ${typeId} 不存在`));
                    return;
                }
                
                // 2. 获取该类型的所有题目
                const questions = await this.getQuestionsByTypeId(typeId);
                
                // 3. 获取该类型的所有标签
                const tags = await this.getTagsByTypeId(typeId);
                
                // 4. 在单个事务中处理所有删除和更新
                const transaction = this.db.transaction(
                    ['question_types', 'questions', 'question_tags', 'question_tag_relations'], 
                    'readwrite'
                );
                
                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    const message = `类型 ${typeId} 删除完成:\n` +
                                `  - 移除了 ${questions.length} 道题目的类型关联\n` +
                                `  - 删除了 ${tags.length} 个标签\n` +
                                `  - 清理了相关的关系记录`;
                    console.log(message);
                    this.clearSearchCache();
                    resolve({
                        typeId,
                        questionsUpdated: questions.length,
                        tagsDeleted: tags.length,
                        message
                    });
                };
                
                const typeStore = transaction.objectStore('question_types');
                const questionStore = transaction.objectStore('questions');
                const tagStore = transaction.objectStore('question_tags');
                const relationStore = transaction.objectStore('question_tag_relations');
                
                // 删除类型
                typeStore.delete(typeId);
                
                // 处理该类型的所有题目：将type_id设为null
                for (const question of questions) {
                    const updatedQuestion = {
                        ...question,
                        type_id: null,
                        updated_at: new Date().toISOString()
                    };
                    questionStore.put(updatedQuestion);
                }
                
                // 处理该类型的所有标签
                for (const tag of tags) {
                    // 先删除标签的所有关系
                    const tagRelations = await this.getRelationsByTagId(tag.id);
                    for (const relation of tagRelations) {
                        relationStore.delete(relation.id);
                    }
                    
                    // 删除标签
                    tagStore.delete(tag.id);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }
    // ---------- 题目相关操作 ----------
    async addQuestion(question) {
        return this.executeTransaction('questions', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add({
                    content: question.content,
                    answer: question.answer || '',
                    type_id: question.type_id,
                    exam_id: question.exam_id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getQuestion(id) {
        return this.executeTransaction('questions', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    // 获取所有题目
    async getAllQuestions() {
        return this.executeTransaction('questions', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    async getQuestionsByExamId(examId) {
        return this.executeTransaction('questions', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('exam_id_idx');
                const request = index.getAll(examId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getQuestionsByTypeId(typeId) {
        return this.executeTransaction('questions', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('type_id_idx');
                const request = index.getAll(typeId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    /**
     * 高级搜索题目功能，支持根据试卷名、题目类型、标签等多个条件进行搜索
     * @param {Object} params - 搜索参数对象
     * @param {string} [params.examName] - 试卷名称，用于搜索相关试卷下的题目
     * @param {number} [params.typeId] - 题目类型ID，用于搜索特定类型的题目
     * @param {Array<number>} [params.tagIds=[]] - 标签ID数组，用于搜索具有指定标签的题目
     * @returns {Promise<Array<Object>>} 返回包含题目详细信息的数组，每个题目对象包含题目基本信息、试卷信息、类型信息和标签信息
     * @throws {Error} 当搜索过程中发生错误时抛出异常
    */
    async searchQuestions({ examName, typeId, tagIds = [] }) {
        // 结果集
        let results = new Map(); // 使用Map确保题目唯一性
        
        try {
            // 条件1: 根据试卷名搜索
            if (examName) {
                const matchedExams = await this.searchExamsByName(examName);
                const examIds = matchedExams.map(exam => exam.id);
                
                if (examIds.length > 0) {
                    // 获取这些试卷的所有题目
                    for (const examId of examIds) {
                        const examQuestions = await this.getQuestionsByExamId(examId);
                        examQuestions.forEach(question => {
                            results.set(question.id, question);
                        });
                    }
                }
            }
            
            // 条件2: 根据题目类型搜索
            if (typeId) {
                const typeQuestions = await this.getQuestionsByTypeId(typeId);
                typeQuestions.forEach(question => {
                    results.set(question.id, question);
                });
            }
            
            // 条件3: 根据标签搜索（多个标签取并集）
            if (tagIds && tagIds.length > 0) {
                for (const tagId of tagIds) {
                    const tagQuestions = await this.getQuestionsByTagId(tagId);
                    tagQuestions.forEach(question => {
                        results.set(question.id, question);
                    });
                }
            }
            
            // 如果没有任何条件，返回所有题目
            if (!examName && !typeId && (!tagIds || tagIds.length === 0)) {
                const allQuestions = await this.getAllQuestions();
                allQuestions.forEach(question => {
                    results.set(question.id, question);
                });
            }
            
            // 转换为数组并丰富题目信息
            const questionsArray = Array.from(results.values());
            
            // 为每个题目获取详细信息
            const enrichedQuestions = await Promise.all(
                questionsArray.map(async (question) => {
                    try {
                        const [exam, questionType, tags] = await Promise.all([
                            this.getExam(question.exam_id).catch(() => null),
                            this.executeTransaction('question_types', 'readonly', (store) => {
                                return new Promise((resolve) => {
                                    const request = store.get(question.type_id);
                                    request.onsuccess = () => resolve(request.result);
                                    request.onerror = () => resolve(null);
                                });
                            }),
                            this.getTagsByQuestionId(question.id).catch(() => [])
                        ]);
                        
                        return {
                            ...question,
                            exam_info: exam,
                            type_info: questionType,
                            tags: tags
                        };
                    } catch (error) {
                        console.error('获取题目详情失败:', error);
                        return question;
                    }
                })
            );
            
            return enrichedQuestions;
            
        } catch (error) {
            console.error('搜索题目失败:', error);
            throw error;
        }
    }

    async updateQuestion(id, questionData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            
            // 先查询
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const question = getRequest.result;
                if (!question) {
                    reject(new Error('题目不存在'));
                    return;
                }
                
                // 再更新
                const updatedQuestion = {
                    ...question,
                    ...questionData,
                    updated_at: new Date().toISOString()
                };
                
                const putRequest = store.put(updatedQuestion);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = (event) => reject(event.target.error);
            };
            
            getRequest.onerror = (event) => reject(event.target.error);
            transaction.onerror = (event) => reject(event.target.error);
        });
    }
    
    async deleteQuestion(id) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            try {
                // 先获取所有关系
                const relations = await this.getRelationsByQuestionId(id);
                
                // 在同一个事务中删除
                const transaction = this.db.transaction(
                    ['questions', 'question_tag_relations'], 
                    'readwrite'
                );
                
                const questionStore = transaction.objectStore('questions');
                const relationStore = transaction.objectStore('question_tag_relations');
                
                // 删除题目
                const deleteQuestionRequest = questionStore.delete(id);
                
                // 删除所有关系
                for (const relation of relations) {
                    relationStore.delete(relation.id);
                }
                
                deleteQuestionRequest.onsuccess = () => resolve(true);
                transaction.oncomplete = () => resolve(true);
                transaction.onerror = (event) => reject(event.target.error);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // ---------- 题目标签相关操作 ----------
    async addQuestionTag(content, typeId) {
        return this.executeTransaction('question_tags', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add({
                    content: content,
                    type_id: typeId,
                    created_at: new Date().toISOString()
                });
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getTagsByTypeId(typeId) {
        return this.executeTransaction('question_tags', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('type_id_idx');
                const request = index.getAll(typeId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // ---------- 新增：删除题目标签 ----------
    async deleteQuestionTag(tagId) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            try {
                // 1. 先检查标签是否存在
                const tag = await this.executeTransaction('question_tags', 'readonly', (store) => {
                    return new Promise((resolve, reject) => {
                        const request = store.get(tagId);
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = (event) => reject(event.target.error);
                    });
                });
                
                if (!tag) {
                    reject(new Error(`题目标签ID ${tagId} 不存在`));
                    return;
                }
                
                // 2. 获取使用此标签的所有关系
                const relations = await this.getRelationsByTagId(tagId);
                
                // 3. 在单个事务中删除标签及其所有关系
                const transaction = this.db.transaction(
                    ['question_tags', 'question_tag_relations'], 
                    'readwrite'
                );
                
                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
                
                transaction.oncomplete = () => {
                    console.log(`标签 ${tagId} 删除成功，移除了 ${relations.length} 个关系`);
                    this.clearSearchCache();
                    resolve(true);
                };
                
                const tagStore = transaction.objectStore('question_tags');
                const relationStore = transaction.objectStore('question_tag_relations');
                
                // 删除标签
                tagStore.delete(tagId);
                
                // 删除所有相关关系
                for (const relation of relations) {
                    relationStore.delete(relation.id);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // 辅助方法：根据标签ID获取所有关系
    async getRelationsByTagId(tagId) {
        return this.executeTransaction('question_tag_relations', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('tag_id_idx');
                const request = index.getAll(tagId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // ---------- 推荐版：根据ID更新题目标签 ----------
    async updateQuestionTag(id, updateData) {
        if (!updateData || (!updateData.content && !updateData.type_id)) {
            throw new Error('至少需要提供标签内容或类型ID进行更新');
        }
        
        if (updateData.content && updateData.content.trim() === '') {
            throw new Error('标签内容不能为空');
        }
        
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            const transaction = this.db.transaction(['question_tags'], 'readwrite');
            const store = transaction.objectStore('question_tags');
            
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const tag = getRequest.result;
                if (!tag) {
                    reject(new Error(`题目标签ID ${id} 不存在`));
                    return;
                }
                
                const updatedTag = {
                    ...tag,
                    ...updateData,
                    updated_at: new Date().toISOString()
                };
                
                const performUpdate = () => {
                    const putRequest = store.put(updatedTag);
                    
                    putRequest.onsuccess = () => {
                        console.log(`题目标签 ${updatedTag.id} 更新成功`);
                        this.clearSearchCache();
                        
                        if (updatedTag.type_id && updatedTag.type_id !== tag.type_id) {
                            console.log(`标签 ${updatedTag.id} 的类型从 ${tag.type_id} 改为 ${updatedTag.type_id}`);
                        }
                        
                        resolve(putRequest.result);
                    };
                    
                    putRequest.onerror = (event) => reject(event.target.error);
                };
                
                // 检查唯一性约束
                if (updateData.content && updateData.content !== tag.content) {
                    const index = store.index('content_idx');
                    const checkRequest = index.get(updateData.content);
                    
                    checkRequest.onsuccess = () => {
                        const existingTag = checkRequest.result;
                        if (existingTag && existingTag.id !== id) {
                            reject(new Error(`题目标签 "${updateData.content}" 已存在`));
                            return;
                        }
                        performUpdate();
                    };
                    
                    checkRequest.onerror = (event) => reject(event.target.error);
                } else {
                    performUpdate();
                }
            };
            
            getRequest.onerror = (event) => reject(event.target.error);
            transaction.onerror = (event) => reject(event.target.error);
        });
    }
            
    

    async getAllTags() {
        return this.executeTransaction('question_tags', 'readonly', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // ---------- 题目-标签关系操作 ----------
    async addTagToQuestion(questionId, tagId) {
        return this.executeTransaction('question_tag_relations', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const request = store.add({
                    question_id: questionId,
                    tag_id: tagId,
                    created_at: new Date().toISOString()
                });
                
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async getTagsByQuestionId(questionId) {
        return this.executeTransaction('question_tag_relations', 'readonly', async (store) => {
            // 获取所有关系
            const relations = await new Promise((resolve, reject) => {
                const index = store.index('question_id_idx');
                const request = index.getAll(questionId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            if (relations.length === 0) return [];
            
            // 获取标签详情 - 需要在新的事务中
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['question_tags'], 'readonly');
                const tagStore = transaction.objectStore('question_tags');
                
                const tagPromises = relations.map(relation => {
                    return new Promise((resolveTag, rejectTag) => {
                        const request = tagStore.get(relation.tag_id);
                        request.onsuccess = () => resolveTag(request.result);
                        request.onerror = (event) => rejectTag(event.target.error);
                    });
                });
                
                Promise.all(tagPromises)
                    .then(tags => resolve(tags.filter(tag => tag !== undefined)))
                    .catch(reject);
            });
        });
    }
    
    async getQuestionsByTagId(tagId) {
        return this.executeTransaction('question_tag_relations', 'readonly', async (store) => {
            // 获取所有关系
            const relations = await new Promise((resolve, reject) => {
                const index = store.index('tag_id_idx');
                const request = index.getAll(tagId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            if (relations.length === 0) return [];
            
            // 获取题目详情
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['questions'], 'readonly');
                const questionStore = transaction.objectStore('questions');
                
                const questionPromises = relations.map(relation => {
                    return new Promise((resolveQuestion, rejectQuestion) => {
                        const request = questionStore.get(relation.question_id);
                        request.onsuccess = () => resolveQuestion(request.result);
                        request.onerror = (event) => rejectQuestion(event.target.error);
                    });
                });
                
                Promise.all(questionPromises)
                    .then(questions => resolve(questions.filter(q => q !== undefined)))
                    .catch(reject);
            });
        });
    }
    
    async removeTagFromQuestion(questionId, tagId) {
        return this.executeTransaction('question_tag_relations', 'readwrite', async (store) => {
            // 先找到关系ID
            const relation = await new Promise((resolve, reject) => {
                const index = store.index('question_tag_idx');
                const request = index.get([questionId, tagId]);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            if (!relation) return false;
            
            return new Promise((resolve, reject) => {
                const request = store.delete(relation.id);
                request.onsuccess = () => resolve(true);
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    async removeAllTagsFromQuestion(questionId) {
        return this.executeTransaction('question_tag_relations', 'readwrite', (store) => {
            return new Promise((resolve, reject) => {
                const index = store.index('question_id_idx');
                const request = index.openCursor(questionId);
                const deletePromises = [];
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        deletePromises.push(new Promise((res, rej) => {
                            const deleteRequest = store.delete(cursor.primaryKey);
                            deleteRequest.onsuccess = () => res();
                            deleteRequest.onerror = (e) => rej(e.target.error);
                        }));
                        cursor.continue();
                    } else {
                        Promise.all(deletePromises)
                            .then(() => resolve(true))
                            .catch(reject);
                    }
                };
                
                request.onerror = (event) => reject(event.target.error);
            });
        });
    }
    
    // ---------- 工具方法 ----------
    executeTransaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            
            try {
                const transaction = this.db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                
                // 执行操作
                const result = operation(store);
                
                // 如果返回的是Promise，等待它完成
                if (result && typeof result.then === 'function') {
                    result.then(resolve).catch(reject);
                } else {
                    // 否则等待事务完成
                    transaction.oncomplete = () => resolve(result);
                }
                
                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 清空数据库（用于测试）
    async clearDatabase() {
        const storeNames = [
            'exams', 
            'questions', 
            'question_types', 
            'question_tags', 
            'question_tag_relations'
        ];
        
        for (const storeName of storeNames) {
            await this.executeTransaction(storeName, 'readwrite', (store) => {
                return new Promise((resolve, reject) => {
                    const request = store.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = (event) => reject(event.target.error);
                });
            });
        }
        
        console.log('数据库已清空');
        return true;
    }
    /**
     * 彻底删除整个数据库
     * @returns {Promise<boolean>} 删除成功返回true
     */
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            // 首先关闭数据库连接
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            
            // 重置单例实例
            ExamDatabase.instance = null;
            
            // 删除IndexedDB数据库
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log(`数据库 "${this.dbName}" 删除成功`);
                
                // 清除window上的引用（如果存在）
                if (typeof window !== 'undefined') {
                    delete window.examDB;
                }
                
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error(`数据库 "${this.dbName}" 删除失败:`, event.target.error);
                reject(event.target.error);
            };
            
            // 处理阻塞情况
            request.onblocked = (event) => {
                console.warn(`数据库 "${this.dbName}" 删除被阻塞，请确保所有连接已关闭`);
                // 可以提示用户关闭其他标签页或刷新页面
                reject(new Error('数据库删除被阻塞，请确保没有其他页面正在使用此数据库'));
            };
        });
    }
    // 获取数据库信息
    async getDatabaseInfo() {
        try {
            const [exams, questions, tags, types] = await Promise.all([
                this.getAllExams().catch(() => []),
                this.executeTransaction('questions', 'readonly', (store) => {
                    return new Promise((resolve) => {
                        const request = store.getAll();
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => resolve([]);
                    });
                }),
                this.getAllTags().catch(() => []),
                this.getAllQuestionTypes().catch(() => [])
            ]);
            
            return {
                exams: exams.length,
                questions: questions.length,
                questionTypes: types.length,
                questionTags: tags.length
            };
        } catch (error) {
            return {
                exams: 0,
                questions: 0,
                questionTypes: 0,
                questionTags: 0,
                error: error.message
            };
        }
    }
}

// 在浏览器环境中自动初始化
    if (typeof window !== 'undefined') {
    // 自动初始化并暴露
    (async () => {
        const instance = ExamDatabase.getInstance();
        await instance.init();
        window.ExamDatabase = ExamDatabase;
        window.examDB = instance;
        console.log('ExamDatabase 已加载，使用 window.examDB 访问');
    })();
}