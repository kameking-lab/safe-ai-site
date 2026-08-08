/**
 * External review pack provenance.
 *
 * `source` combines the reviewed primary/internal source with the SHA-256 of
 * the exact claim snapshot. A changed source or changed claim therefore fails
 * import validation and requires a fresh review. No reviewer identity or
 * review comment is stored in this registry.
 */
export type HeatClaimRegistryEntry = {
  claimId: string;
  role: "legal" | "medical" | "editorial";
  source: string;
  duplicateOf?: string;
};

export const HEAT_CLAIM_REGISTRY: readonly HeatClaimRegistryEntry[] = [
  {
    claimId: "HL-L-001",
    role: "legal",
    source:
      "https://laws.e-gov.go.jp/law/347M50002000032|review-sha256:a6ee11a456194251716c3eaecf15b9ab09d748db2da6341f07afec521190d561",
  },
  {
    claimId: "HL-L-002",
    role: "legal",
    source:
      "https://laws.e-gov.go.jp/law/347M50002000032|review-sha256:f869e86d48f98f5f964ec664286ac2a0a4b64ba3c4e154a7862c38b9b4d7b596",
  },
  {
    claimId: "HL-L-003",
    role: "legal",
    source:
      "https://laws.e-gov.go.jp/law/347M50002000032|review-sha256:f49d7925b1c0b9ed6756de8fe3442da090ce557a8354932124f3c66c751b39a4",
  },
  {
    claimId: "HL-L-004",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/content/11303000/001490911.pdf|review-sha256:0f9c481953e353d9962419dd984e29816a93ac966b7d10e7baf26d255efab4bb",
  },
  {
    claimId: "HL-L-005",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/content/11303000/001490911.pdf|review-sha256:8fd795eeab51432cb3827909cda1aa4208093cf98afb5042b8ebb5f67d24bf41",
  },
  {
    claimId: "HL-L-006",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:2864bc9ee3763fff3a5e3d36ada49a1a7d01deed9fec18332e3577f7a68068c4",
  },
  {
    claimId: "HL-L-007",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:f2574ee9ae4b7bd04765824676b71e80177fb5d13fe7cefe689b22903ac4d2c0",
  },
  {
    claimId: "HL-L-008",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:8e9c78642623ba75ca580bc1ae211d7f074cfa7eda384770daccf170e09d470c",
  },
  {
    claimId: "HL-L-009",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:3a1a0dffee215362965690a718fcba9098f8323c3968ed314957895b80b0aa72",
  },
  {
    claimId: "HL-L-010",
    role: "legal",
    source:
      "https://laws.e-gov.go.jp/law/347M50002000032|review-sha256:9f519c71c7e84afe83162be562c23be5e3cd84f6661f4e0aff2cdeb0ff8d3e86",
  },
  {
    claimId: "HL-L-011",
    role: "legal",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:ca14b46c02f99dd9fed2b90566f0655286df1ba1c8dfd529a9a8e0bc9035ee09",
  },
  {
    claimId: "HL-L-012",
    role: "legal",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:a5c79861f1bcc8f6458fa0c42b140f4121d705ce1b7629b4a1b84c590630cb15",
  },
  {
    claimId: "HL-M-001",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/study/|review-sha256:13f624dee1f14d8855db0cf18a1a3fa908140ee782fd8d6f00fab8811b09476f",
  },
  {
    claimId: "HL-M-002",
    role: "medical",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:b8ccda4468f521e47e226563c5e09aaffca7c48376bb96e3972579f0166ee328",
  },
  {
    claimId: "HL-M-003",
    role: "medical",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:095d277dba06b35585f4f4e836a0b92f47a240c5b70f6d8d73b4835e9c269761",
  },
  {
    claimId: "HL-M-004",
    role: "medical",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:57f6e0ec533ba6b57f6f09a11725b3bdf110b8c7c0ecfb5f8d7005d74b383f8c",
  },
  {
    claimId: "HL-M-005",
    role: "medical",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:80b883bb83c011a95f78bf2065095b77f7e2939eff5083b28b4481171dac49a0",
  },
  {
    claimId: "HL-M-006",
    role: "medical",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:e64eb1ae0a3661ffb19582399a80f2eb54f433b3b902e3019fec6d6d67c15e03",
  },
  {
    claimId: "HL-M-007",
    role: "medical",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:ec7b6dc69714dcb3498b4a36e894e9a8c503724a9b09b78fe0a41e63d7ebb9f9",
  },
  {
    claimId: "HL-M-008",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:0147b30553667ede514f8e91037a0c2be3fb81fc0ae3cf3e31e9ebd251a806b9",
  },
  {
    claimId: "HL-M-009",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:b2fef8076a4e855329941222f22727f2d46b3e72228e7da600bf6d14b483fe7c",
  },
  {
    claimId: "HL-M-010",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:72466355130f8d33a520743afd8fd303db257f39c15dd172c33fedccfc4138a6",
  },
  {
    claimId: "HL-M-011",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:4c0ae81330d936e1f8cf98cc27a7771edfb8b72d87906b1689067d428b5e4d1e",
  },
  {
    claimId: "HL-M-012",
    role: "medical",
    source:
      "https://www.fdma.go.jp/relocation/kyukyukikaku/oukyu/05kobetsu/index.html|review-sha256:29b884d03537135acc6b101ca9bc138d36ee835613f5ba3ae37bffbcd00da7a8",
  },
  {
    claimId: "HL-M-013",
    role: "medical",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:678aaea30a6b56df80ceb2d242f316e900702210891ade32ccd8125bc7800b05",
  },
  {
    claimId: "HL-M-014",
    role: "medical",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:9196d18a07d2414e09857125628bc13413a0b0eca7d742d84e78309946c0090c",
  },
  {
    claimId: "HL-M-015",
    role: "medical",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:5750e5e1344432916ca68c63a33a384a0fda90e7ff08e3477368f216cea1a3b4",
  },
  {
    claimId: "HL-E-001",
    role: "editorial",
    source:
      "/heat-illness-prevention|review-sha256:f582c5afd350627636c28089077eab9c79dda0e964ecf8d9b9411d9c5cca6d18",
  },
  {
    claimId: "HL-E-002",
    role: "editorial",
    source:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1|review-sha256:69c3d7d4bfce9bf3334a7fbfaa6a742d3db6fb05d53d64d77b07eacd473d07fd",
  },
  {
    claimId: "HL-E-003",
    role: "editorial",
    source:
      "https://laws.e-gov.go.jp/law/347M50002000032|review-sha256:2a34db3ea34fbdaa24f3755fc848a775645b54f8e78baf72e0c25f7da083ba2b",
  },
  {
    claimId: "HL-E-004",
    role: "editorial",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:f19cdc469ee9ff2c9cf1c8dc9713342f12b7247433975f30d67ebdf5da170388",
  },
  {
    claimId: "HL-E-005",
    role: "editorial",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:cc13f020ff12bf0bb8a359e6f4b190929c6ddda1148777648b73bcaa6d3665a8",
  },
  {
    claimId: "HL-E-006",
    role: "editorial",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:dc275950e6773ebead5e15df34442727a16b0dc69c22a54b3d5a2934c0bdd459",
  },
  {
    claimId: "HL-E-007",
    role: "editorial",
    source:
      "/heat-illness-prevention|review-sha256:e341c9d60efef357cf65860c94ad6e93e60fc284b3a6e1b150bec64fed68ae70",
  },
  {
    claimId: "HL-E-008",
    role: "editorial",
    source:
      "/ky/paper?topic=heat-illness|review-sha256:2f3b6a1dd6a32b0c4de125cd1dc40aac082a737543f56c1a46cfe0572acfb8d9",
  },
  {
    claimId: "HL-E-009",
    role: "editorial",
    source:
      "/services/automation?consultationType=heat-illness-training#consult-form|review-sha256:5b8f85ab8725c1c9a1cb60e2e0237dff88d5caeb8bde6509b3cc56fd802f9354",
  },
  {
    claimId: "HL-E-010",
    role: "editorial",
    source:
      "https://neccyusho.mhlw.go.jp/study/|review-sha256:e6487fffc92e32b23b831207ab9648f08d2c2109a56d654594db26ef141e9839",
  },
  {
    claimId: "HL-E-011",
    role: "editorial",
    source:
      "/heat-illness-prevention/slides|review-sha256:fe4060af0600ecb0832940c0fe7bc48c91f3b174186cc0f898f99d172a79cfff",
  },
  {
    claimId: "HL-E-012",
    role: "editorial",
    source:
      "/heat-illness-prevention/elearning|review-sha256:15b7530ab8009e445e7a31479f6a7e035a9fb777cdf8fb70172b9fa72adebc72",
  },
  {
    claimId: "HL-E-013",
    role: "editorial",
    source:
      "/heat-illness-prevention/elearning|review-sha256:25cada84d9270b2360d90058901205297c74901b981afab4d2dc5d5ac8ca60d4",
  },
  {
    claimId: "HL-E-014",
    role: "editorial",
    source:
      "https://www.wbgt.env.go.jp/wbgt_detail.php|review-sha256:669d4bcda589ea57d245304eb24136511be6f5d77e0dec8429ea68d7f34a25d9",
  },
  {
    claimId: "HL-E-015",
    role: "editorial",
    source:
      "https://neccyusho.mhlw.go.jp/heatstroke/|review-sha256:853aa4f9e68b9e87e3aebf00cf76c5d97f0023ec6cf1242f892b5183083de604",
  },
  {
    claimId: "HL-E-016",
    role: "editorial",
    source:
      "/ky/paper?topic=heat-illness|review-sha256:858d2c5d4e7225684332621659f5e2cedfd4ca11443bb957e17489b534257234",
  },
  {
    claimId: "HL-E-017",
    role: "editorial",
    source:
      "/heat-illness-prevention|review-sha256:15d0f6cb2773c5413ba29cf4c5e7400ef8f0c5d72d808d6e9a6929605f356db9",
  },
  {
    claimId: "HL-E-018",
    role: "editorial",
    source:
      "/heat-illness-prevention/slides|review-sha256:a97a9eb623fdbddf4d29f38fa2a6427bc2759bd7a1f6637389a57fba7c9a5066",
    duplicateOf: "HL-E-010",
  },
  {
    claimId: "HL-E-019",
    role: "editorial",
    source:
      "/heat-illness-prevention/elearning|review-sha256:eb5ada141edfbdc49606a646f415a8ab13526ecec9b6dd185dfdb266f8c7d3c1",
  },
];
