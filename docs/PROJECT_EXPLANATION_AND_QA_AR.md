# DocuMind AI - شرح عربي وأسئلة متوقعة بإجاباتها

## هدف الملف

هذا الملف مخصص للتحضير للمناقشة والعرض أمام لجنة التحكيم. الفكرة ليست فقط شرح
ما يفعله المشروع، بل توضيح كيف تم تصميمه كمنظومة إنتاجية قابلة للربط مع
Frontend وBackend وAPIs، مع التركيز على جزء الإيجنت، منع الهلوسة، الاعتماد على
مصادر PDF فقط، وتوليد الامتحانات من نفس المصدر.

---

## 1. شرح مختصر للمشروع

DocuMind AI هو نظام ذكاء اصطناعي للتعامل مع ملفات PDF بطريقة آمنة ومبنية على
المصدر. المستخدم يرفع ملف أو أكثر داخل شات، ثم يسأل أسئلة طبيعية بالعربية أو
الإنجليزية، والنظام يجيب فقط من المعلومات الموجودة داخل الملفات المرفوعة.

المشروع لا يعتمد على أن الـ LLM "يعرف" الإجابة من ذاكرته العامة. المصدر الحقيقي
هو الـ PDF. لذلك لو السؤال غير مدعوم من الملف، النظام لا يخترع إجابة، بل يرد
بشكل مهني بأن المصدر غير كاف، ويوجه المستخدم لاستشارة طبيب أو متخصص حسب المجال.

---

## 2. وصف سريع للعرض

المشروع عبارة عن Adaptive Multimodal RAG Platform. المستخدم يرفع ملفات PDF،
والباك إند يبني indexes للبحث داخلها، ثم الإيجنت يعيد صياغة السؤال، يبحث في
المصدر، يسترجع الأدلة المناسبة، يرسل هذه الأدلة فقط للـ LLM، ثم يتحقق من دعم
الإجابة بالمصدر ويحسب hallucination risk وgroundedness score. نفس النظام يدعم
توليد امتحانات من مصدر الدكتور أو المحاضر مع تحديد عدد الأسئلة والصعوبة ونوع
الأسئلة واللغة.

---

## 3. الفكرة الأساسية

الفكرة الأساسية هي:

- المصدر المرفوع هو الحقيقة.
- الـ LLM ليس مصدر الحقيقة.
- أي إجابة يجب أن تكون مدعومة بصفحات أو أدلة من الـ PDF.
- لو الدليل غير موجود، النظام يرفض الإجابة بأدب.
- الـ API يرجع response منظم يصلح للفرونت أو لأي نظام خارجي.

---

## 4. المعمارية العامة

```text
User
  |
  v
React Frontend
  |
  | HTTP / JSON / PDF Upload
  v
FastAPI Backend
  |
  +--> Auth Layer
  |      Signup / Login / JWT
  |
  +--> Document APIs
  |      Upload PDFs / Persist Sources / Build Indexes
  |
  +--> Agent Layer
  |      Memory / Query Rewrite / Retrieval / Generation / Verification
  |
  +--> Database Layer
  |      Users / Uploaded PDF Sources
  |
  v
PostgreSQL + Runtime FAISS/BM25 Indexes
```

---

## 5. ما هو الإيجنت في المشروع؟

الإيجنت في هذا المشروع ليس مجرد prompt ولا مجرد chatbot. الإيجنت هو طبقة
orchestration داخل الباك إند. دوره أن يدير خطوات الذكاء الاصطناعي كاملة:

- يفصل كل شات عن الآخر.
- يستخدم ذاكرة قصيرة للمحادثة لفهم الإشارات مثل "اشرح النقطة السابقة".
- لا يعتبر الذاكرة مصدرًا للمعلومة.
- يبني أو يختار الـ index المناسب للشات الحالي.
- يعيد صياغة السؤال ليصبح أفضل للبحث.
- يسترجع الأدلة من ملفات PDF.
- يرسل الأدلة فقط للـ LLM.
- يستخرج claims من الإجابة.
- يتحقق من دعم الإجابة بالمصدر.
- يحسب hallucination risk.
- يرفض الإجابة لو الدليل غير كاف.
- يولد امتحانات من نفس المصدر.

الإيجنت موجود عمليًا في:

- `ChatRagManager`
- `RagService`
- RAG pipeline modules

---

## 6. مسار عمل الإيجنت

```text
User Question
  |
  v
ChatRagManager
  |
  +--> إضافة memory قصيرة لفهم السياق فقط
  |
  v
RagService.ask()
  |
  +--> التأكد أن index المصدر جاهز
  |
  v
RAG Pipeline
  |
  +--> Language Detection
  +--> Query Classification
  +--> Query Rewriting
  +--> Hybrid Retrieval
  +--> Reranking
  +--> Context Building
  +--> LLM Generation
  +--> Claim Extraction
  +--> Citation Verification
  |
  v
Safety Layer
  |
  +--> لو لا يوجد دليل: Refusal
  +--> لو خطر الهلوسة عالي: Refusal
  |
  v
Structured API Response
```

---

## 7. لماذا المشروع ليس RAG عادي؟

أي RAG بسيط يمكنه البحث في chunks ثم إرسالها للـ LLM. لكن DocuMind AI يضيف:

- Query rewriting.
- Hybrid retrieval بين semantic search وBM25.
- Chat-scoped source isolation.
- Memory محدودة لكل شات.
- Source-only refusal.
- Hallucination risk score.
- Groundedness score.
- Claims and citation verification.
- Persistent uploaded PDF sources.
- Exam generation API.
- Pydantic schemas منظمة للفرونت والباك.
- Production deployment باستخدام Docker وRailway.

---

## 8. تصميم الـ APIs

الباك إند مبني باستخدام FastAPI. كل endpoint له request وresponse schema واضح.
هذا مهم لأن المشروع سيتم ربطه بفرونت إند وباك إند وقد يستخدمه أي client خارجي.

المكونات:

- Controllers: تستقبل HTTP requests.
- Schemas: تعرف شكل البيانات باستخدام Pydantic.
- Services: تحتوي business logic.
- Repositories: تتعامل مع قاعدة البيانات.
- Models: تمثل الجداول.
- RAG modules: تحتوي منطق الذكاء الاصطناعي.

---

## 9. أهم APIs في المشروع

### Authentication APIs

الغرض منها إنشاء حسابات وتسجيل دخول وحماية البيانات.

Endpoints متوقعة:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`

الأهمية:

- كل مستخدم له مصادره الخاصة.
- لا يجب أن يرى مستخدم ملفات مستخدم آخر.
- الـ JWT يستخدم لحماية endpoints.

### Document Upload API

Endpoint:

```http
POST /chats/{chat_id}/sources
```

دوره:

- يستقبل ملفات PDF.
- يتحقق أن الملفات PDF فقط.
- يحفظ الملفات مؤقتًا للمعالجة.
- يبني knowledge base وindexes.
- يخزن نسخة من الـ PDF في قاعدة البيانات.
- يرجع حالة البناء وعدد الـ chunks.

### Ask API

Endpoint:

```http
POST /ask
```

Request:

```json
{
  "query": "اشرح هذه النقطة من الملف",
  "chat_id": "chat-123",
  "document_ids": null,
  "verbose": false,
  "use_memory": true
}
```

Response يحتوي:

- answer
- query metadata
- confidence
- hallucination_risk
- groundedness_score
- unsupported_claims
- sources
- evidence
- claims
- raw debug data

### Chat Memory API

Endpoint:

```http
GET /chats/{chat_id}/memory
```

دوره عرض الذاكرة المحدودة للشات. الذاكرة تستخدم فقط لفهم السياق، وليست مصدر
معلومة.

### Exam API

Endpoint:

```http
POST /exam
```

Request:

```json
{
  "chat_id": "chat-123",
  "topic": "Chapter 2",
  "difficulty": "medium",
  "question_count": 10,
  "total_marks": 100,
  "question_types": ["mcq", "short_answer", "essay"],
  "language": "ar"
}
```

دوره توليد امتحان من المصدر المرفوع فقط مع إجابات وشرح وصفحات المصدر.

---

## 10. Query Rewriting

إعادة صياغة السؤال هدفها تحسين البحث داخل الـ PDF. أحيانًا سؤال المستخدم يكون
قصيرًا أو عاميًا أو يشير لصفحة أو جدول. النظام يحوله إلى query أوضح للـ retriever.

مثال:

السؤال الأصلي:

```text
اشرح الجدول اللي في صفحة 5
```

الصياغة المحسنة للبحث:

```text
اشرح الجدول اللي في صفحة 5 page 5 table
```

الفائدة:

- تحسين retrieval.
- دعم أفضل للعربية والإنجليزية.
- فهم page filters.
- تحسين البحث في الجداول والرسوم والملخصات.

---

## 11. سياسة المصدر فقط

النظام لا يجب أن يجيب من خارج ملفات PDF المرفوعة.

لو لا يوجد دليل كاف، تكون الإجابة:

```text
المصدر المرفوع لا يحتوي على معلومات كافية لدعم إجابة موثوقة.
لو السؤال طبي فالأفضل استشارة طبيب، ولو في مجال آخر فاستشر متخصصًا مؤهلًا
في نفس المجال أو ارفع مصدرًا أوضح.
```

هذه الصياغة أفضل من "لا أعرف" لأنها مهنية وتوجه المستخدم للحل الصحيح.

---

## 12. قياس الهلوسة والـ Groundedness

النظام يرجع:

- `hallucination_risk`
- `groundedness_score`
- `unsupported_claims`
- `claims`
- `sources`
- `evidence`

المعنى:

- hallucination risk: احتمال وجود ادعاءات غير مدعومة بالمصدر.
- groundedness score: درجة ارتباط الإجابة بالأدلة المسترجعة.
- unsupported claims: عدد الجمل التي لم يتم دعمها بدليل كاف.

لو خطر الهلوسة عالي، النظام يرفض الإجابة.

---

## 13. Persistent Indexing

مشكلة الـ FAISS وBM25 runtime indexes أنها قد تضيع بعد restart لأنها في الذاكرة.
الحل في المشروع هو تخزين ملفات PDF الأصلية في قاعدة البيانات.

المسار:

```text
Upload PDF
  |
  +--> Build runtime index
  |
  +--> Save PDF bytes in database

Server Restart
  |
  +--> Runtime index missing
  |
  +--> Rebuild from persisted PDFs
  |
  +--> Continue answering
```

هذا مهم جدًا في Railway أو أي Cloud deployment لأن السيرفر ممكن يعيد التشغيل.

---

## 14. قاعدة البيانات

قاعدة البيانات تخزن:

- المستخدمين.
- بيانات تسجيل الدخول.
- ملفات PDF الأصلية.
- علاقة كل PDF بالمستخدم والشات.

هذا يجعل المشروع أقرب للإنتاج الحقيقي وليس مجرد notebook demo.

---

## 15. الفرونت إند

الفرونت مبني بـ React وTypeScript ويدعم:

- Landing page.
- Login/signup.
- PDF upload.
- Chat UI.
- عرض المصادر والثقة.
- Exam generation.
- Voice input حسب دعم المتصفح.
- Responsive mobile layout.
- Dark/light mode.
- Language toggle.

---

## 16. النشر Production

المشروع مجهز للنشر على Railway باستخدام Docker.

المسار:

```text
GitHub
  |
  v
Railway
  |
  v
Docker Build
  |
  +--> Build frontend
  +--> Install backend dependencies
  +--> Install runtime/OCR dependencies
  +--> Run FastAPI using Uvicorn
```

أهم Variables:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `DOCUMIND_LOW_MEMORY`
- `DOCUMIND_MAX_ANSWER_TOKENS`

---

## 17. أسئلة متوقعة وإجاباتها

### سؤال 1: ما المشكلة التي يحلها المشروع؟

المشروع يحل مشكلة الإجابات غير الموثوقة من ملفات PDF. بدل أن يعتمد النظام على
ذاكرة الـ LLM، يجبر الإجابة أن تكون مبنية على المصدر المرفوع فقط، ويرفض لو لا
يوجد دليل كاف.

### سؤال 2: ما الفرق بين مشروعكم وChatGPT file upload؟

مشروعنا منتج قابل للربط والنشر، وليس مجرد واجهة شات. لدينا APIs، authentication،
database، source persistence، hallucination scoring، exam generation، وstructured
responses للفرونت.

### سؤال 3: أين الإيجنت؟

الإيجنت هو طبقة orchestration في الباك إند، ويتمثل في `ChatRagManager` و`RagService`
والـ RAG pipeline. هو الذي يدير الذاكرة، البحث، التوليد، التحقق، الرفض، وتوليد
الامتحانات.

### سؤال 4: هل الإيجنت autonomous agent؟

هو controlled domain-specific agent وليس agent مفتوح يفعل أي شيء. أدواته محدودة:
retrieval، query rewrite، LLM generation، verification، refusal، exam generation.

### سؤال 5: لماذا لم تستخدموا agent مفتوح يبحث في الإنترنت؟

لأن المشروع يحتاج أمان وثقة. في التعليم أو الطب، لا نريد إجابات من خارج مصدر
الدكتور أو الملف المرفوع. لذلك اخترنا controlled agent.

### سؤال 6: ما أدوات الإيجنت؟

أدواته الداخلية هي query rewriting، language detection، query classification،
dense retrieval، BM25 retrieval، table retrieval، visual retrieval، reranking،
context building، LLM generation، claim extraction، citation verification،
hallucination scoring، refusal policy، وexam JSON generation.

### سؤال 7: هل يستخدم النظام الإنترنت؟

لا. المصدر الواقعي الوحيد هو ملفات PDF المرفوعة. الـ LLM يستخدم قدرته اللغوية
لصياغة الإجابة، لكن factual grounding يأتي من الـ PDF فقط.

### سؤال 8: كيف تمنعون الهلوسة؟

نمنع الهلوسة بعدة طبقات: retrieval من المصدر، generation من الأدلة فقط، استخراج
claims، التحقق من citations، حساب hallucination risk، ثم الرفض إذا كانت الإجابة
غير مدعومة.

### سؤال 9: ماذا يحدث لو السؤال من خارج الملف؟

النظام يرفض بلطف ويقول إن المصدر غير كاف. لو السؤال طبي يوصي باستشارة طبيب، ولو
في مجال آخر يوصي بمتخصص في نفس المجال.

### سؤال 10: لماذا لا تقولون فقط "لا أعرف"؟

لأن الرد المهني يجب أن يوضح السبب ويوجه المستخدم للخطوة الصحيحة. "المصدر غير
كاف" أدق من "لا أعرف".

### سؤال 11: ما معنى Query Rewriting؟

هي تحويل سؤال المستخدم إلى صيغة أفضل للبحث داخل الـ PDF بدون تغيير معناه.

### سؤال 12: هل Query Rewriting قد تغير معنى السؤال؟

لا يجب أن تغير المعنى. هي تضيف hints للبحث مثل page number أو table أو chart،
مع الاحتفاظ بالسؤال الأصلي في response.

### سؤال 13: ما هو Hybrid Retrieval؟

هو الجمع بين semantic retrieval وkeyword retrieval. الأول يفهم المعنى، والثاني
يمسك الكلمات الدقيقة والأرقام والتعريفات.

### سؤال 14: لماذا FAISS؟

FAISS سريع ومناسب للبحث vector similarity في runtime، خصوصًا في hackathon وMVP.
للإنتاج الأكبر يمكن الانتقال إلى pgvector أو Qdrant أو Pinecone.

### سؤال 15: هل FAISS يضيع بعد restart؟

نعم، runtime index قد يضيع. لذلك نخزن ملفات PDF الأصلية في database ونعيد بناء
الـ index عند الحاجة.

### سؤال 16: لماذا لا تخزنون الـ vector index فقط؟

تخزين PDF الأصلي يسمح بإعادة بناء الفهرس عند تغيير chunking أو embeddings أو
بعد restart. مستقبلاً يمكن تخزين الاثنين.

### سؤال 17: ما دور PostgreSQL؟

تخزين المستخدمين ومصادر PDF المرفوعة وربط كل مصدر بالـ user والـ chat.

### سؤال 18: هل كل شات منفصل؟

نعم. كل chat له مصادره وindex الخاص به حتى لا تختلط ملفات المستخدمين أو الشاتات.

### سؤال 19: كيف تعمل الذاكرة؟

الذاكرة تخزن آخر رسائل بشكل محدود. تستخدم لفهم الإشارات فقط، مثل "اشرح النقطة
السابقة"، لكنها ليست مصدرًا factual.

### سؤال 20: هل يمكن للـ LLM الإجابة من الذاكرة؟

لا. الذاكرة تساعد في فهم السؤال، لكن الإجابة النهائية يجب أن تكون من الـ PDF.

### سؤال 21: ما هو LLM provider؟

المشروع يستخدم Groq من خلال `GROQ_API_KEY` كمتغير بيئة.

### سؤال 22: هل Groq API key وحده يكفي؟

لا. نحتاج أيضًا `DATABASE_URL` للبيانات و`JWT_SECRET_KEY` للأمان، بالإضافة إلى
إعدادات التشغيل.

### سؤال 23: ما أهم APIs؟

أهم APIs هي signup، login، upload sources، ask، chat memory، exam، وhealth.

### سؤال 24: لماذا FastAPI؟

لأنه سريع، typed، مناسب للإنتاج، ويدعم Pydantic وautomatic API docs.

### سؤال 25: لماذا Pydantic؟

لضمان validation واضح وشكل ثابت للـ request والـ response، وهذا يقلل أخطاء
الربط مع الفرونت.

### سؤال 26: ما شكل Ask Response؟

يرجع answer وquery metadata وconfidence وhallucination risk وgroundedness score
وunsupported claims وsources وevidence وclaims وraw data.

### سؤال 27: لماذا تعرضون hallucination risk للفرونت؟

لأن المستخدم ولجنة التقييم يجب أن يروا درجة الثقة والدعم، وليس نص الإجابة فقط.

### سؤال 28: ما هو Exam API؟

API يولد امتحانًا من الـ PDF المرفوع فقط، مع تحديد topic وdifficulty وعدد
الأسئلة والدرجات والأنواع واللغة.

### سؤال 29: كيف يستفيد الدكتور الجامعي؟

يرفع الدكتور lecture notes أو chapter، ثم يطلب امتحانًا بمواصفات معينة. النظام
يرجع أسئلة وإجابات وشرح وصفحات المصدر.

### سؤال 30: كيف تضمنون أن أسئلة الامتحان من الملف؟

توليد الامتحان يمر بنفس RAG flow، مع prompt يلزم الـ LLM باستخدام المصدر فقط
وإخراج JSON منظم مع صفحات المصدر.

### سؤال 31: ماذا لو رجع Exam API JSON غير صحيح؟

الباك إند يكتشف ذلك ويرجع error controlled بدل إرسال بيانات مكسورة للفرونت.

### سؤال 32: هل النظام يدعم العربية؟

نعم. يدعم أسئلة عربية، refusal عربي، وexam generation بالعربية.

### سؤال 33: هل يدعم الإنجليزية؟

نعم. نفس الـ APIs تدعم العربية والإنجليزية.

### سؤال 34: كيف يتصل الفرونت بالباك؟

عن طريق HTTP requests للـ FastAPI. الملفات ترفع multipart، والأسئلة ترسل JSON،
والـ token يرسل Bearer token.

### سؤال 35: هل voice recognition موجود؟

يمكن دعم voice input من الفرونت باستخدام Web Speech API حسب دعم المتصفح. هذا
يحول الصوت إلى نص ثم يرسل النص إلى Ask API.

### سؤال 36: هل الصوت جزء من الباك؟

حاليًا هو feature في الفرونت. مستقبلاً يمكن إضافة backend speech-to-text مثل
Whisper API.

### سؤال 37: لماذا Docker؟

لأن Docker يضمن بيئة تشغيل ثابتة: build للفرونت، install للباك، dependencies،
ثم تشغيل FastAPI.

### سؤال 38: لماذا Railway؟

Railway مناسب للنشر السريع، يدعم Docker وenvironment variables وlogs وmanaged
database.

### سؤال 39: ما سبب مشكلة `uvicorn: command not found`؟

عادة تحدث عندما لا يتم تثبيت dependencies داخل container أو start command يعمل
في بيئة غير صحيحة. الحل هو Dockerfile صحيح يثبت requirements ويشغل uvicorn.

### سؤال 40: ما سبب مشكلة memory في السيرفر؟

الـ RAG يستهلك ذاكرة في parsing، embeddings، indexes، OCR، وبناء context. لذلك
نحتاج low-memory mode وتقليل token budget وربما vector DB خارجي لاحقًا.

### سؤال 41: كيف عالجتم memory؟

استخدمنا إعدادات low memory وتقليل answer tokens وتخزين PDF لإعادة بناء indexes.
مستقبلاً يمكن نقل vector storage لخدمة خارجية.

### سؤال 42: هل API keys آمنة؟

يجب وضعها في environment variables فقط وعدم رفعها على GitHub.

### سؤال 43: ما معنى MVC في المشروع؟

لدينا structure قريب من MVC/Clean Architecture: controllers للطلبات، schemas
للعقود، services للمنطق، repositories للداتا، models للجداول، وRAG modules للذكاء
الاصطناعي.

### سؤال 44: لماذا فصلتم الكود؟

لأن الفصل يجعل المشروع أسهل في الصيانة والاختبار والتطوير، ويظهر كود production
وليس notebook فقط.

### سؤال 45: ما أقوى نقطة في المشروع؟

أنه يجمع بين منتج حقيقي وAI safety: login، upload، chat، exams، source-only
answers، hallucination risk، persistent sources، وAPIs منظمة.

### سؤال 46: ما نقطة الضعف الحالية؟

الـ vector index ليس persistent vector DB كامل حتى الآن. لكنه يعاد بناؤه من
PDFs المحفوظة. الخطوة القادمة هي pgvector أو Qdrant.

### سؤال 47: ماذا ستطورون لاحقًا؟

Persistent vector database، background jobs، OCR أقوى، export exams، admin
dashboard، evaluation dataset، automated hallucination tests، backend voice
recognition، وroles للطلاب والدكاترة.

### سؤال 48: كيف تقيمون جودة الإجابة؟

نقيم retrieval relevance، citation correctness، groundedness، hallucination risk،
refusal accuracy، latency، واستهلاك الذاكرة.

### سؤال 49: ما معنى refusal accuracy؟

أن يرفض النظام فقط عندما لا يوجد دليل، ويجيب عندما يكون الدليل موجودًا.

### سؤال 50: ما معنى citation correctness؟

أن الصفحة أو الدليل المذكور يحتوي فعلًا على معلومة تدعم الإجابة.

### سؤال 51: هل النظام مناسب للطب؟

هو مناسب كمساعد تعليمي source-grounded، لكنه ليس بديلًا للطبيب. لذلك عند نقص
الدليل يوصي باستشارة طبيب.

### سؤال 52: هل يمكن استخدامه في الجامعات؟

نعم، في شرح المحاضرات، أسئلة الطلاب، توليد امتحانات، ومراجعة محتوى من مصدر
الدكتور نفسه.

### سؤال 53: هل يدعم أكثر من PDF؟

نعم، upload API يقبل أكثر من PDF ويبني knowledge base للشات.

### سؤال 54: ماذا يحدث إذا رفع المستخدم ملفًا غير PDF؟

الباك يرفضه برسالة validation لأن المدعوم حاليًا PDF فقط.

### سؤال 55: هل يمكن لمستخدم رؤية ملفات مستخدم آخر؟

التصميم يربط المصادر بالـ user والـ chat ويستخدم authentication لتقليل هذا
الخطر.

### سؤال 56: لماذا يوجد raw في response؟

للتطوير والـ debugging. في نسخة production أكثر صرامة يمكن تقليله أو إخفاؤه عن
المستخدم العادي.

### سؤال 57: ما الفرق بين confidence وgroundedness؟

confidence تقدير عام لجودة الإجابة، بينما groundedness يقيس تحديدًا مدى دعم
الإجابة بالأدلة من الـ PDF.

### سؤال 58: هل يمكن تلخيص PDF؟

نعم، بشرط أن يكون التلخيص من محتوى الـ PDF وليس من معرفة خارجية.

### سؤال 59: هل يتعامل مع الجداول والرسوم؟

يوجد دعم pipeline للجداول والعناصر البصرية، لكن الجودة تعتمد على جودة الـ PDF
والـ OCR والاستخراج.

### سؤال 60: ماذا لو PDF scanned؟

يحتاج OCR. المشروع يحتوي على dependencies ووظائف مرتبطة بـ OCR، لكن جودة
النتيجة تعتمد على وضوح المسح.

### سؤال 61: ما أهم جملة تختم بها العرض؟

DocuMind AI مبني على مبدأ أن المصدر المرفوع هو الحقيقة. الإيجنت لا يخترع
الإجابات، بل يسترجع الأدلة، يتحقق منها، يقيس المخاطر، ويرفض عندما لا يكون
المصدر كافيًا.

---

## 18. نقاط قوة يجب ذكرها في العرض

- المشروع ليس chatbot عادي.
- الـ Agent controlled وآمن.
- الـ PDF هو source of truth.
- الـ API منظم باستخدام Pydantic.
- يوجد hallucination risk وgroundedness score.
- يوجد exam generation للدكاترة والجامعات.
- يوجد persistent source storage بعد restart.
- الباك منظم كـ production architecture.

---

## 19. إجابة جاهزة عن القيود

المشروع قوي كنموذج إنتاجي أولي وHackathon project، لكن يمكن تطويره أكثر. أهم
الخطوات القادمة هي persistent vector database، background indexing، OCR أقوى،
اختبارات تقييم أكثر، monitoring، وتصدير الامتحانات كـ PDF أو Word.

---

## 20. الخلاصة

DocuMind AI يحول ملفات PDF إلى مصدر تفاعلي موثوق. قوة المشروع ليست فقط في
الإجابة، بل في أن الإجابة قابلة للتتبع والتحقق، وأن النظام يرفض عندما لا يوجد
دليل كاف. هذا يجعله مناسبًا للتعليم، الجامعات، والمجالات الحساسة التي تحتاج
دقة ومصدر واضح.
