import type { AgentMessage, AgentModelOption, DocBlock, ReviewIssue } from "./types";

/**
 * 骨架示例数据。
 *
 * 全部集中在 `utils/patent/mock.ts`：接后端时逐个替换成
 * `/api/com.ictrek.v-office/api/v1/ai/*` 的真实返回值即可，
 * 组件不感知数据来源。
 */

export const AGENT_MODELS: AgentModelOption[] = [
  { id: "default", label: "默认模型", note: "走企业网关" },
  { id: "long-context", label: "长上下文", note: "材料多时选它" },
  { id: "fast", label: "快速", note: "只做润色 / 问答" },
];

/** 阶段标签对齐 patent-disclosure-skill 的 Step 1..8 */
export const SKILL_STAGES = [
  "Step 1 收敛输入",
  "Step 2 材料扫描",
  "Step 3-4 挖专利点",
  "Step 5 轻量查新",
  "Step 5.5 区别特征定位",
  "Step 6 成文大纲",
  "Step 7 成文",
  "Step 8 自检",
] as const;

/** 交底书正文（结构化段落，锚点用于行内标注与 AI 变更定位） */
export const MOCK_DOC_BLOCKS: DocBlock[] = [
  {
    id: "b1",
    anchor: "1.1",
    heading: "技术领域",
    text: "本实用新型涉及机械连接件技术领域，尤其涉及一种卡扣式快装连接结构，适用于需要免工具装配的板件与支架之间的固定。",
  },
  {
    id: "b2",
    anchor: "1.2",
    heading: "背景技术",
    text: "现有同类结构多采用螺钉或插销固定：螺钉方案装配需工具、拆装耗时长，且在薄壁件上反复拆装易滑牙；插销方案虽免工具，但依赖弹簧件，长期振动下存在松脱风险。",
  },
  {
    id: "b3",
    anchor: "1.3",
    heading: "现有技术缺陷",
    text: "（1）装配依赖工具，现场作业效率低；（2）反复拆装导致螺纹失效；（3）弹簧式插销在振动工况下松脱概率高，缺少二次锁止。",
  },
  {
    id: "b4",
    anchor: "2.1",
    heading: "技术方案",
    text: "本结构包括基座、弹性卡臂与限位凸台。基座设有导向斜面；两片弹性卡臂自基座两侧一体延伸并收口形成卡口；限位凸台设置于卡臂自由端内侧，与导向斜面配合在插入行程末端产生二次锁止。",
  },
  {
    id: "b5",
    anchor: "2.2",
    heading: "有益效果",
    text: "免工具装配，单次拆装时间显著缩短；二次锁止结构替代弹簧件，降低振动松脱风险；一体成型减少了零件数量与装配工序。",
  },
];

/** 申请文件审阅：问题清单（图 2 右栏 + 正文高亮） */
export const MOCK_REVIEW_ISSUES: ReviewIssue[] = [
  {
    id: "i1",
    severity: "high",
    title: "独权缺少必要技术特征",
    detail: "权利要求 1 未记载「限位凸台与导向斜面配合」这一实现二次锁止的必要特征，与交底书 2.1 不一致。",
    suggestion: "将限位凸台及配合关系补入权利要求 1，并在从属权要中保留收口角度限定。",
    anchor: "2.1",
    snippet: "限位凸台设置于卡臂自由端内侧",
    status: "open",
    reviewer: "LM",
    at: "4h",
  },
  {
    id: "i2",
    severity: "mid",
    title: "背景技术引证未给公开号",
    detail: "背景技术提到「插销方案依赖弹簧件」，但未给出对比文件公开号，不符合撰写口径。",
    suggestion: "补一篇最接近的对比文件公开号，或在查新章节说明未检索到对应文献。",
    anchor: "1.2",
    snippet: "插销方案虽免工具，但依赖弹簧件",
    status: "open",
    reviewer: "PH",
    at: "2h",
  },
  {
    id: "i3",
    severity: "low",
    title: "附图件号与说明书不一致",
    detail: "说明书出现「卡口 21」，而附图清单中 21 为弹性卡臂，件号冲突。",
    suggestion: "以 figure_plan.yaml 为准统一件号后重新成文。",
    anchor: "2.1",
    snippet: "两片弹性卡臂自基座两侧一体延伸",
    status: "resolved",
    reviewer: "WY",
    at: "1h",
  },
];

/** 撰写室：AI 对话流（含变更卡片） */
export const MOCK_AGENT_THREAD: AgentMessage[] = [
  {
    id: "m1",
    role: "user",
    text: "我上传了装配图纸和测试记录，按实用新型交底书写，件号不要自己编。",
    at: "09:12",
  },
  {
    id: "m2",
    role: "agent",
    stage: "Step 2 材料扫描",
    text: "已读取 3 份材料（2 张装配图、1 份振动测试记录）。识别到 7 个部件，其中 2 个在测试记录中没有出现，已放入待确认清单。",
    at: "09:13",
  },
  {
    id: "m3",
    role: "agent",
    stage: "Step 7 成文",
    text: "已完成技术方案与有益效果两节。下面两处改动建议你确认后再落文。",
    at: "09:21",
    changes: [
      {
        id: "c1",
        operation: "replace",
        anchor: "2.1",
        before: "两片弹性卡臂自基座两侧延伸形成卡口。",
        after:
          "两片弹性卡臂自基座两侧一体延伸并收口形成卡口，收口角度为 15°~25°，以在插入行程中提供渐进夹紧力。",
        reason: "补充可实施的数值范围，避免权要因「无法实现」被质疑；范围取自图纸公差标注。",
        status: "proposed",
      },
      {
        id: "c2",
        operation: "insert",
        anchor: "2.2",
        after:
          "经振动测试记录，二次锁止结构在 10~55 Hz 扫频下未出现松脱，相较弹簧插销方案故障率下降。",
        reason: "用材料中的实测数据支撑有益效果，替换原「效果显著」的泛泛表述。",
        status: "proposed",
      },
    ],
  },
];
