import type { Question } from "./types";

export const QUESTIONS: Question[] = [
  {
    id: "transport-01",
    index: 1,
    category: "暮らしと移動",
    title: "公共交通への行政支出を増やすことについて",
    prompt:
      "自治体がバスや鉄道などの公共交通を維持するために、今より多く税金を使うことに賛成ですか？",
    helper: "利用頻度や費用負担など、あなたの実感をそのまま話してください。",
    sourcePack: {
      questionId: "transport-01",
      summary:
        "公共交通への支援は、移動手段の確保と費用負担のバランスをどう考えるかという論点です。",
      argumentsFor: [
        {
          title: "移動手段を守る",
          body: "車を運転しない人や高齢者にとって、通院・通学・買い物の足を維持しやすくなります。",
        },
        {
          title: "地域の選択肢を残す",
          body: "利用者が少ない地域でも、将来の移動手段を急に失わずに済む可能性があります。",
        },
      ],
      argumentsAgainst: [
        {
          title: "負担の公平さ",
          body: "利用者が限られる場合、利用しない人も含めた税負担をどう考えるかが課題になります。",
        },
        {
          title: "効率化の余地",
          body: "運行方法や路線を見直し、支援額を増やす前に効率化を優先すべきだという考え方があります。",
        },
      ],
      sources: [
        {
          id: "mlit-transport",
          title: "地域公共交通について",
          publisher: "国土交通省",
          url: "https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000041.html",
          retrievedAt: "2026-09-15",
        },
        {
          id: "mlit-whitepaper",
          title: "交通政策白書",
          publisher: "国土交通省",
          url: "https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_tk_000039.html",
          retrievedAt: "2026-09-15",
        },
      ],
    },
  },
  {
    id: "childcare-02",
    index: 2,
    category: "子育てと教育",
    title: "子育て世帯への公的支援について",
    prompt:
      "子育て世帯への給付や保育サービスを、税金を使ってさらに拡充することに賛成ですか？",
    helper: "自分の生活との距離感や、支援の優先順位を話してみてください。",
    sourcePack: {
      questionId: "childcare-02",
      summary: "子育て支援をどの世帯へ、どの方法で届けるかが中心的な論点です。",
      argumentsFor: [
        { title: "負担を分かち合う", body: "子育てにかかる費用や時間の負担を、社会全体で支える考え方です。" },
        { title: "地域の持続性", body: "子育てしやすい環境が、将来の地域の担い手を支えるという見方があります。" },
      ],
      argumentsAgainst: [
        { title: "対象の優先順位", body: "限られた財源の中で、所得や困りごとに応じた重点化を求める意見があります。" },
        { title: "現金以外の支援", body: "給付を増やすより、保育の質や働き方の改善を優先すべきだという考え方があります。" },
      ],
      sources: [
        {
          id: "cfa-childcare",
          title: "こども・子育て政策",
          publisher: "こども家庭庁",
          url: "https://www.cfa.go.jp/policies",
          retrievedAt: "2026-09-15",
        },
      ],
    },
  },
  {
    id: "disaster-03",
    index: 3,
    category: "安全と防災",
    title: "災害への備えを優先することについて",
    prompt:
      "道路・避難所・防災設備などへの公的支出を増やし、平時の別の施策より防災を優先することに賛成ですか？",
    helper: "最近の災害経験や、備えにどのくらい安心を感じるかを話してください。",
    sourcePack: {
      questionId: "disaster-03",
      summary: "災害に備えるための平時の投資と、他の行政サービスとの優先順位が論点です。",
      argumentsFor: [
        { title: "被害を小さくする", body: "事前の整備や訓練によって、発災後の被害や復旧負担を減らせる可能性があります。" },
        { title: "命に直結する", body: "個人だけでは準備しにくい避難所や道路を、地域で整える意義があります。" },
      ],
      argumentsAgainst: [
        { title: "過剰投資の懸念", body: "起きる頻度や地域差を踏まえ、必要な場所へ絞るべきだという考え方があります。" },
        { title: "日常施策との両立", body: "防災以外の福祉や教育なども含めた、長期的な優先順位が必要になります。" },
      ],
      sources: [
        {
          id: "cabinet-disaster",
          title: "防災情報のページ",
          publisher: "内閣府 防災情報",
          url: "https://www.bousai.go.jp/",
          retrievedAt: "2026-09-15",
        },
      ],
    },
  },
  {
    id: "energy-04",
    index: 4,
    category: "環境とエネルギー",
    title: "再生可能エネルギーへの転換について",
    prompt:
      "環境負荷を下げるため、再生可能エネルギーへの投資や導入を進めることに賛成ですか？",
    helper: "費用、景観、安定供給など、気になる点を自由に話してください。",
    sourcePack: {
      questionId: "energy-04",
      summary: "脱炭素、電力の安定供給、導入コストや地域との合意形成が論点です。",
      argumentsFor: [
        { title: "環境負荷を下げる", body: "温室効果ガスの排出を減らす選択肢として導入を進める考え方があります。" },
        { title: "地域の分散電源", body: "地域で電力を生み出すことで、供給の選択肢を広げられる可能性があります。" },
      ],
      argumentsAgainst: [
        { title: "安定性と費用", body: "天候による変動や設備費を含め、安定供給と負担のバランスが課題になります。" },
        { title: "地域との調整", body: "景観・環境への影響や、施設を受け入れる地域との合意形成が必要です。" },
      ],
      sources: [
        {
          id: "meti-energy",
          title: "エネルギー政策",
          publisher: "資源エネルギー庁",
          url: "https://www.enecho.meti.go.jp/category/saving_and_new/saiene/",
          retrievedAt: "2026-09-15",
        },
      ],
    },
  },
  {
    id: "local-finance-05",
    index: 5,
    category: "地域の財政",
    title: "行政サービスと負担のバランスについて",
    prompt:
      "行政サービスを維持するために、必要であれば住民の負担が増えることも受け入れるべきだと思いますか？",
    helper: "増やしたいサービスや、避けたい負担があれば教えてください。",
    sourcePack: {
      questionId: "local-finance-05",
      summary: "サービスの水準、受益と負担、公平性、将来世代への影響が論点です。",
      argumentsFor: [
        { title: "サービスを守る", body: "必要な行政サービスを安定して提供するため、負担を分かち合う考え方です。" },
        { title: "将来への投資", body: "短期的な負担で、将来の地域の安心や成長を支えるという見方があります。" },
      ],
      argumentsAgainst: [
        { title: "家計への影響", body: "収入や生活状況によって負担感は異なるため、増負担に慎重な意見があります。" },
        { title: "行政の見直し", body: "負担を求める前に、事業の優先順位や運営方法を見直すべきだという考え方があります。" },
      ],
      sources: [
        {
          id: "soumu-local",
          title: "地方財政制度",
          publisher: "総務省",
          url: "https://www.soumu.go.jp/iken/zaisei.html",
          retrievedAt: "2026-09-15",
        },
      ],
    },
  },
];
