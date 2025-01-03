---
allDay: true
cssclasses:
  - review2
title: Keywords for AI trends in 2025
date: 2024-12-29
---
# 2025년 GenAI 분야에서 더욱 자주 사용하게 될 Keywords로 보는 Trends
### 1. AGI (Artificial General Intelligence)
정의 : 인간처럼 학습하고 사고하고, 인간의 지능과 비슷하거나 넘어서는 것.
특정 기능만 인간을 흉내낼 수 있는 narrow AI(weak AI)와 대조되는 개념.
최근 AI의 목표(특히 OpenAI와 Meta)는 AGI이다.
정확한 **정의**는 없이 우선 용어와 개념부터 만들고 나중에 정의하려는 분위기다.
OpenAI의 공식홈페이지에 AGI는 (https://openai.com/charter/) 경제적으로 가치 있는 일에서 인간을 능가하는 높은 자율성을 가진 시스템이라고 정의했다. ('23. 2/24)

> by which we mean highly autonomous systems that outperform humans at most economically valuable work

중요한 뉴스는 아니지만 최신 뉴스라서 잠깐 소개하자면, 위 정의에 "*경제적으로 가치있는 일*"을 수치적으로 정했다고 한다.
2024년 12월26일에 (The Information(유료 인터넷신문) https://www.theinformation.com/articles/microsoft-and-openais-secret-agi-definition) OpenAI가 최소1000억달러(150조원)의 수익을 낼 때 AGI라고 부를 수 있다고 했다. → 2029년으로 목표.

![center|600](<./_images/Pasted image 20241228192436.png>)

내 생각 : 신문에는 '정의'라고 썼지만 돈 액수로 이 용어를 정의할 수는 없다. 단지 AGI라는 용어를 이용해 그냥 비즈니스 모델을 정의한 것이라 해석하면 될 것 같다.

![](<./_images/Pasted image 20241228193424.png>)

2024년 12월27일 공식홈피 글에 또한 (https://openai.com/index/why-our-structure-must-evolve-to-advance-our-mission/)

> think of the mission as a [continuous objective](https://openai.com/index/planning-for-agi-and-beyond/) rather than just building any **single system**. ... We seek to evolve in order to take the next step in our mission, helping to build the AGI economy and ensuring it benefits humanity.

MS가 투자해서 컸지만, 수익을 내면 MS의 간섭을 안 받고 독자적으로 하겠다는 미묘한 선언의 전초적인 포석을 만드는 것이라는 해석도 많다.

참고: ARC-AGI는 benchmark 점수를 가끔 AGI라고도 쓰니 혼동 금지.


### 2. AI Agents / Agentic AI / Agentic world / Agentic workflows
Agent란 무엇인가? 역시나 이것도 AGI와 마찬가지로 **용어**는 있고 **개념**도 있다. 그러나 누구도 정확한 **정의**에 대해 합의안을 도출하지 못함.
AI의 Microservices 형태로 볼 수도 있고, 작은 AI apps로 볼 수도 있다.

AI Agent는 AI assistant와 비교되는 개념으로도 쓰인다.
AI assitant는 Amazon Alexa, Apple Siri, ChatGPT3처럼 prompt 질문에 수동적인 답변을 내는 것
AI Agent는 prompt 질문에 대해 단계적으로 수행해야될 툴과 행동을 스스로 쪼개서 사고하는 것을 말하기도 한다. 그렇다면 추론형 GPT의 성격을 띈 것이라고 말할 수도 있다.

정확하게 정의를 할 수 없으면, 갖추어야할 가장 중요한 요소는 무엇인가를 논의할 수도 있는데,
다음 사항이 있을 수 있다.
- autonomous 동작 → 그러나 이것 자체도 모호한 개념이다.
- access memory → more personalized experience
- reason → 자신의 input과 output 사이에 어떠한 추론이 들어가야 agent다 → 이 얘기는 prompt를 받아 유저에게 답변을 하기 전에 LLM을 한 번 더 거치는 것을 agent의 필요 요소라고 하면 되는가? 이것도 애매하다.
- act (via tools) → 웹을 검색하거나 간단하게 계산기 앱을 실행한다거나, SQL 쿼리를 하거나, LLM에 다시 넣거나.

https://www.youtube.com/watch?v=F8NKVhkZZWI
이 영상에서는 ReAct agent는 LLM에게 주도권을 주는 것을 말한다고 한다. SQL query는 **단순**한 쿼리를 **빠르게** 것을 추구하지만 LLM과 추론 모델은 **복잡한 것**을 **시간을 두고 사고(reason)** 하는 것을 지향한다. 그러므로 과거 기존 쿼리랑 반대의 개념이다. 이에 기존 백엔드 쿼리보다 LLM이 주도권을 주는 것을 agent라 할 수도 있겠다.

Andrew Ng의 '24.6/13 LinkedIn 블로그 글 : https://www.linkedin.com/posts/andrewyng_apples-gen-ai-strategy-stabilitys-copyright-clear-activity-7207059565136236544-9vDg/

> Unlike the noun “agent,” the adjective “agentic” allows us to contemplate such systems and include all of them in this growing movement.

![center|500](<./_images/Pasted image 20241229145838.png>)
어떤 것이 agentic하다에는 동의를 많이 할 수 있다, we only have different degress of agenticness.
예시1: 내 이메일들을 보고, 우선 순위를 부여해 To-Do list를 자동으로 생성해주는 것 → agentic하다라고 할 수 있다.
예시2: 고객센터에서 보고된 프로그램 버그를 '자동'으로 분류해 해당 디버깅 팀 담당자로 보내는 것 → agentic하다.
→ 위 예시들은 Copilot Pages와 Copilot Studio에서 개발하고 있는 것들 중 하나.
→ Google에서는 Vertex AI Agent Builder, Genkit 이런 agent builder를 개발 중.

내 생각: 과거 모든 제안서들에 AI라는 단어를 넣었듯이, 기존 앱 개발자들이 agent라는 단어 하나 넣어 제안서를 작성하지 않을까.

만약 위 내용대로 agent를 정의할 수 없고, agentic한 것에 동의를 할 수 있다면,
그렇다면 *agentic* 하기 위해서는 반드시 LLM을 사용해야하는 것도 아니다. 
사실 Agent라는 용어는 LLM 이전에 존재했던 용어이기 때문. 하드코딩된 알고리즘도 agentic하다라고 할 수 있다. → 혹은 BERT와 같은 custom trained model만 있어도 된다.

2025년 1~2월에 openAI에서 'Operator'라는 이름의 AI비서를 출시할 예정이다. 사실상 500만 이상 다운로드 건은 구글과 OpenAI의 자체 앱밖에 없는 것으로 보아 저커버그가 말하는 agent AI들의 시대가 올 지, 거대 IT기업만 만들 수 있는 것인지도 생태계가 불투명하다.
참고: https://www.youtube.com/watch?v=Vy3OkbtUa5k '24.7/23 Mark Zuckerberg 인터뷰에서 LLAMA 3.1 open source 생태계로 중장기적으로 수십억 수백업개의 AI agent가 생기는 시대가 올 것이라고 얘기한다.

'24.12/13에 올라온 MS의 CEO 인터뷰 영상에서 : https://www.youtube.com/watch?v=9NtsnzRFJ_o&t=3622s
46분12초에 다음과 같은 말을 한다.

>SaaS application or Business applications that exist will probably all collapse in the agent era, because they are essentially CRUD databases with bunch of business logics. The business logic is all going to these agents. And these agents will be *multi-repo* CRUD, meaning they're going to update multiple databases and all the logic will be in the AI tier. And once the AI tier becomes the place where all the logic is then people will start replacing the backends. Not just CRM but even with what we call finance and operations, Copilot to Agent to my business application should be very seamless.          <span class='cite'>- Satya Nadella</span>

내가 내 방식대로 해석을 하자면,
요즘은 대부분 3티어 아키텍쳐이다.
UI를 담당하는 Frontend - 유저와의 소통을 담당하는 껍데기이다.
CRUD를 해주는 Backend
그리고 database가 있다.
Nadella의 말에 의하면 AI tier가 추가되어 4티어 아키텍쳐가 될 것이라고 한다.
그런데 백엔드에서 담당하던 일들이 점점 AI tier로 그 역할이 넘어가면서 백엔드가 사라질 것이라는 뜻이다.

그럼 Agent는 어떻게 만드는가?
Anthropic 홈페이지에 입문에 관한 좋은 글이 있다. ('24.12/20 업데이트된 글): https://www.anthropic.com/research/building-effective-agents

### 3. Multi-modal and Cross-modal
이미지, 텍스트, 음성, 영상 모두 Input Output 동시에 학습시키고 결과를 낸다.
ChatGPT-4와 4o의 차이점은 *o*가 *omni* 모델이라는 것의 약자. 즉, 텍스트 뿐 아니라 이미지, 음성 전체(omni)를 뜻한다.
이유 1. Multi modal이 아니면 AI 시대에 살아남을 수 없다 - 학습데이터의 고갈. ChatGPT가 5조개 문서로 학습, LLAMA 3.1은 이보다 몇 십배 많은 데이터로 학습
이유 2. AGI를 이루기 위해 인간처럼 학습하고 사고하려면 다양한 형태의 데이터가 필요하다.

### 4. On-Device AI
민감한 정보를 위해 필요.
MS - Copilot plus PC
Apple - Apple Intelligence
Google - Gemma → Android에서 돌아가는 AI

### 5. near infinite memory
단순히 구글에서 검색 히스토리가 아닌, 내 정보들을 다시 데이터로 활용하기 위해 저장해놓으려면 저장소가 필요.
Mustafa Suleyman은 메모리가 2025년 inflection point의 주요 요소가 될 것이라고 했다.
Mustafa는 우리가 과거 프롬트한 모든 것을 영구적으로 저장해야하고 이를 위해서 무한대 메모리가 필요하다고 올해 발언했다.

### 6. Advanced Inference Model / Inference(추론) compute time / Reasoning
GPT가 3, 4 등 숫자로 내다가 OpenAI o1 (Orion) ('24.9/12)을 내고, o2를 건너뛰고 o3를 ('24.12/21에) 발표하였다. 
Orion은 fully-automated inference framework으로 추론을 특화한 다른 모델
o1은 GPT-5에 들어갈 것(아직 예정)으로 Mensa IQ 테스트에서 120이 나왔다고 한다.
GPT와 가장 큰 차이점은 추론(inference) processing도 있지만 미리 학습된 것이 아닌, 실시간으로 최신 웹사이트를 검색해보고 답을 알려주는 데에 있다.
이제 LLM의 reasoning을 개발하는 방법이 두 가지 메인스트림이 되었다. 하나는 더 좋은 데이터로 학습을 시키는 방법, 그리고 하나는 inference compute time을 더 주는 방법, 단지 학습뿐 아니라 추론 과정도 학습하도록 만드는 것 → which can lead to smarter AI agents.

Google AI의 Jeff Dean은 '24.12/19에 Gemini 2.0 Flash Thinking을 발표하였다 → 생각하는 과정을 보여준다.

#### GPUs
pre-training에는 GPU가 국룰이지만, 이 추론 알고리즘에는 (아직도 GPU가 가장 낫지만) 새로운 chip이 더 효율적이라는 분석도 나오고 있다. Nvidia GPU보다 추론에 최적화된 칩이 나온다면 GPU시장도 새로운 경쟁이 시작될 것이다.

### 7. Very Large LLM
LLAMA 3.1이 0.405조개, GPT-4가 1.76조개의 매개변수로 학습. 다음 세대 LLM은 약 50조 매개변수를 계획한다는 썰도 있다.
![](<./_images/Pasted image 20241226004958.png>)

### 8. Very Small LLM
아주 작은 것은 매개변수 10억~ 몇 십억 단위 수준의 모델을 뜻한다. 데스크탑에 돌아갈 정도. 작은 AI agent를 위해서는 거의 필수라고 생각할 수 있다.

### 9. Domain Specific Models / Industry Specific Models
단지 매개변수가 크냐 적냐의 문제가 아닌, 한 분야에 특화된 모델을 내는 것도 검토 중. 사실상 AI Agent와 비슷한 개념이기도 하다.

### 10. Foundation Model + methodology/frameworks
위 7,8,9번과 연관된 개념이긴 하지만 좀 더 자세히 보자면 다음과 같은 뉴스도 있다.

#### LCM(Large Concept Models)
LLM은 원초적인 단계에서는 결국 tokenization을 통해 다음 단어를 예측하는 모델이다. → 어떻게 보면 advanced auto-complete model, 또 다르게 보자면 'next-token prediction model'이라고 할 수 있다. 
기본 태생이 이렇기 때문에 이런 모델로 개념에 기반한 인간의 논리적인 사고를 하기 어렵다는 얘기가 있다.
이와 비교해 LCM은 'next-concept prediction model'이다. (https://ai.meta.com/research/publications/large-concept-models-language-modeling-in-a-sentence-representation-space/)
(https://github.com/facebookresearch/large_concept_model)

#### DeepSeek V3
최근('24.12/30) 오픈소스로 중국에서 개발한 DeepSeek V3가 일부 벤치마크 점수에서 앞섰다고 한다. H100보다 낮은 H800으로 약$5.5million(약 80억원 - LLAMA3.1 405b의 약 1/11수준)으로 이룬 결과이다. 이는 오픈소스 Foundation Model과 새로운 methodology로 더 좋은 결과를 낼 여지가 있는 것을 시사한다. 

#### KAG(Knowledge Augmented Generation), RemoteRAG
RAG system의 단점(벡터유사성과 knowledge의 갭에서 hallucination)을 보완해줄 후보인 KAG가 논문으로 발표되었다. 또한 민감한 data의 privacy leakage를 막아줄 RemoteRAG 방식에 대한 논문도 발표되었다.
CoT(Chain-of-thought), zero-shot / few-shot prompting도 있다.
Meta+MS의 RAFT: https://ai.meta.com/blog/raft-llama-retrieval-augmented-generation-supervised-fine-tuning-microsoft/

### 11. Humanoids(휴머노이드)
테슬라의 옵티머스2 발표 - 과거처럼 알고리즘을 짤 필요가 없다. 공장에 노동자로 투입 가능 시점 당겨진다. 
(보스톤 다이나믹스는 열심히하고 있니)

### 12. More use-cases of AI
2024년에는 customer UX 발전, 자동화, virtual assistants, 사이버 보안에도 기여하였다.
E-commerce에서는 초개인화에 대한 use cases도 더 발전되는 추세이다.
#### Hardware
아마존의 새로운 Alexa가 Claude AI를 사용하고 'Remarkable Alexa'라는 이름으로 출시할 것이라 8월에 발표했지만 아직 소식은 없다.
#### Ilya Sutskever
OpenAI의 co-founder이고 chief scientist가 올해 퇴사하고 독립 회사를 설립하였다. 이미 $1bn 투자를 받을 것으로 예상됨.
#### Mira Murati
OpenAI의 CTO도 퇴사하고 벤처를 설립하였다. $100miliion를 투자받을 것으로 예상된다.
![center|400](<./_images/Pasted image 20250101125926.png>)


### 13. 변곡점 (inflection point)
아무도 키워드로 뽑지 않지만, 그냥 내가 키워드로 뽑았다.
미국 거대 공룡 IT기업끼리 GPU를 사들이며 출혈 경쟁을 벌이는 중인데
이 모든 과정이의 이유는 딱 하나 - 다른 기업보다 변곡점을 찾기 위해서로 보여진다.
AI가 어느 때보다도 빠르게 발전하고 있지만 많은 사람들이 어떤 한계에 부딪치면 또 하나의 혁신에 목말라있다.

이런 이야기도 있다.
똑똑한 동물들도 많다. 도구를 보며주면 활용하는. 어떤 유튜브에서는 침팬지가 인덕션에 고구마도 구워먹는다.
그러나 결국 인류 발전사와의 차이는 인간은 도구로 다른 도구를 만들 수 있다는 점이고, 이를 문자로 기록에 남겼다는 이론이 있다. 동물들은 도구를 사용할 정도로 똑똑하지만 도구로 다른 도구를 만드는 생각을 하지 못한다고 한다.
만약 인공지능을 더 나은 인공지능을 만드는 데 사용한다면 그것이 변곡점이 될 것이라는 얘기도 있다.

### 14. AI의 안전과 위험 / 윤리
좋은 분야에도 활용되지만, 2024년에는 피싱 문자가 세계적으로 1200% 늘어났다고 한다. 사이버공격 자체도 AI를 이용하여 더 늘어날 것이다.
