# Test Fixtures

테스트용 샘플 파일 저장소입니다.

## 실제 테스트 파일

테스트 파일은 `tests/test_file/`에 있습니다:

| 파일 | 유형 | 상태 |
|------|------|------|
| `Sae Uraguchi.charx` | 캐릭터 카드 (CharX) | ✅ 있음 |
| `test_bot.png` | 캐릭터 카드 (PNG) | ✅ 있음 |
| `test_bot2.jpeg` | 캐릭터 카드 (JPEG) | ✅ 있음 |
| `테스트.risum` | 모듈 | ✅ 있음 |
| `🍄제논 dlc.risum` | 모듈 | ✅ 있음 |
| `🔦라이트보드...risum` | 모듈 | ✅ 있음 |
| `🔭 망원경...risup` | 프리셋 | ✅ 있음 |
| `🦋PSYCHE v0.9.risup` | 프리셋 | ✅ 있음 |

## 디렉토리 구조

```
tests/
├── fixtures/
│   ├── README.md          # 이 파일
│   └── minimal/           # 최소 테스트용 JSON 파일
│       ├── card.json      # 캐릭터 카드 메타데이터
│       ├── module.json    # 모듈 메타데이터
│       └── preset.json    # 프리셋 메타데이터
└── test_file/             # 실제 테스트 파일
    ├── *.charx            # 캐릭터 카드
    ├── *.png              # 캐릭터 카드 (PNG)
    ├── *.jpeg             # 캐릭터 카드 (JPEG)
    ├── *.risum            # 모듈
    └── *.risup            # 프리셋
```

## 캐릭터 카드 형식

캐릭터 카드는 여러 파일 형식을 지원합니다:
- `.charx` - ZIP 아카이브 형식
- `.png` - PNG tEXt 청크에 메타데이터 포함
- `.jpg/.jpeg` - CharX-JPEG (JPEG + ZIP 결합)
