const profileRules = {
  planning: [
    {pattern: /暑假|寒假|七月|7月|八月|8月|阶段|安排|计划|进度|优先级/g, weight: 2},
    {pattern: /主线|不断线|强化|基础|一轮|二轮|复盘|错题|补漏洞/g, weight: 2},
    {pattern: /数学|高数|线代|概率/g, weight: 1},
    {pattern: /英语|单词|阅读/g, weight: 1},
    {pattern: /政治/g, weight: 1},
  ],
  news: [
    {pattern: /公告|发布|官网|招生|通知|政策|考试科目/g, weight: 2},
    {pattern: /调整为|改为|变为|从.+到|原来|原专业课|自命题|统考/g, weight: 3},
    {pattern: /影响|目标.+同学|报考|核对官方/g, weight: 1},
  ],
  knowledge: [
    {pattern: /为什么|是什么|如何|问题|概念|原理/g, weight: 2},
    {pattern: /原因|例如|例子|方法|步骤|判断|分析/g, weight: 1},
    {pattern: /总结|归纳|记住/g, weight: 1},
  ],
};

const countMatches = (text, expression) => {
  expression.lastIndex = 0;
  return [...text.matchAll(expression)].length;
};

export const supportedProfiles = ['planning', 'news', 'knowledge'];

export const scoreProfiles = (cues) => {
  const text = cues.map((cue) => cue.text).join(' ');
  const scores = Object.fromEntries(
    Object.entries(profileRules).map(([profile, rules]) => [
      profile,
      rules.reduce((total, rule) => total + countMatches(text, rule.pattern) * rule.weight, 0),
    ]),
  );

  const planningSubjects = [
    /数学|高数|线代|概率/,
    /408|数据结构|组成原理|操作系统|计算机网络|专业课/,
    /英语|单词|阅读/,
    /政治/,
  ].filter((pattern) => pattern.test(text)).length;
  if (planningSubjects >= 3 && /安排|计划|阶段|主线|优先级|暑假|寒假/.test(text)) {
    scores.planning += planningSubjects * 2;
  }
  if (/调整为|改为|自命题.+统考|原来.+现在/.test(text)) {
    scores.news += 5;
  }
  return scores;
};

export const selectProfile = (cues, requestedProfile = 'auto') => {
  if (requestedProfile !== 'auto') {
    if (!supportedProfiles.includes(requestedProfile)) {
      throw new Error(`PROFILE_INVALID: expected auto|${supportedProfiles.join('|')}, got ${requestedProfile}`);
    }
    return {profile: requestedProfile, confidence: 1, evidence: [`explicit:${requestedProfile}`]};
  }

  const scores = scoreProfiles(cues);
  const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [winner, second] = ranking;
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const confidence = total === 0 ? 0 : winner[1] / total;
  const margin = winner[1] - second[1];
  if (winner[1] < 3 || margin < 1) {
    throw new Error(
      `PROFILE_AMBIGUOUS: choose planning, news, or knowledge explicitly. Scores: ${JSON.stringify(scores)}`,
    );
  }
  return {
    profile: winner[0],
    confidence: Number(confidence.toFixed(3)),
    evidence: ranking.map(([profile, score]) => `${profile}:${score}`),
  };
};

const planningLabel = (cue, index, cueCount) => {
  const text = cue.text;
  if (index === cueCount - 1 && /总结|一句话|归纳|最后/.test(text)) return '总结';
  if (index === 0) return '结论';
  if (/政治/.test(text)) return '政治';
  if (/英语|单词|阅读/.test(text)) return '英语';
  if (/数学|高数|线代|概率/.test(text)) return '数学';
  if (/408|数据结构|组成原理|操作系统|计算机网络|专业课/.test(text)) return '408';
  if (/主线|总原则|整体/.test(text)) return '主线';
  return '';
};

const newsLabel = (cue, index) => {
  const text = cue.text;
  if (/现在|建议|先核对|下一步|暑期阶段|还没开始/.test(text)) return '行动';
  if (/数据结构|组成原理|操作系统|计算机网络/.test(text)) return '四门';
  if (/调整为|改为|变为|自命题|统考|885|初试第?四科|从$/.test(text)) return '变化';
  if (/同学|目标|影响|报考|复习资料|复习方向|后续|需要/.test(text)) return '影响';
  if (/公告|发布|官网|通知|招生|考试科目/.test(text) || index === 0) return '公告';
  return '';
};

const knowledgeLabel = (cue, index, cueCount) => {
  const text = cue.text;
  if (index === cueCount - 1 || /总结|归纳/.test(text)) return '总结';
  if (index === 0 || /为什么|是什么|问题/.test(text)) return '问题';
  if (/例如|例子|比如/.test(text)) return '例子';
  if (/方法|步骤|先判断|做题/.test(text)) return '方法';
  if (/概念|原理|关键|原因/.test(text)) return '概念';
  return '';
};

const profileFallback = {
  planning: '主线',
  news: '事实',
  knowledge: '解释',
};

export const labelCuesForProfile = (cues, profile) => {
  let previous = profileFallback[profile];
  return cues.map((cue, index) => {
    const label =
      profile === 'planning'
        ? planningLabel(cue, index, cues.length)
        : profile === 'news'
          ? newsLabel(cue, index)
          : knowledgeLabel(cue, index, cues.length);
    previous = label || previous;
    return {...cue, semanticLabel: previous};
  });
};

export const profileKicker = (profile, label) => {
  if (profile === 'planning') return label === '总结' ? '一句话原则' : '暑期复习安排';
  if (profile === 'news') return label === '公告' ? '官方信息' : '考试信息更新';
  return label === '问题' ? '先看问题' : '知识讲解';
};
