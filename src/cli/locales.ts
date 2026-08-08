/**
 * CLI-only translation strings, merged into i18next under the `cli` namespace
 * key at init. These cover terminal-specific UI (menus, key hints, tile-mode
 * prompts) that the web client has no equivalent for, so they live here rather
 * than polluting the shared web locale files. Gameplay/lobby/error strings
 * continue to come from the shared `src/locales/*.json`.
 */
import type { Language } from './i18n';

export interface CliStrings {
  appTitle: string;
  menu: {
    connect: string;
    settings: string;
    replay: string;
    quit: string;
  };
  tileMode: {
    prompt: string;
    unicode: string;
    ascii: string;
    hint: string;
    change: string;
  };
  language: string;
  animationSpeed: string;
  keys: {
    move: string;
    select: string;
    back: string;
    quit: string;
    confirm: string;
    chat: string;
    auto: string;
    riichi: string;
  };
  connect: {
    mode: string;
    login: string;
    register: string;
    server: string;
    connecting: string;
    savedFound: string;
  };
  lobby: {
    heading: string;
    roomIdPrompt: string;
    addAiType: string;
  };
  config: {
    title: string;
    create: string;
    hint: string;
  };
  game: {
    yourTurn: string;
    waiting: string;
    chooseTile: string;
    chooseGroup: string;
    riichiSelect: string;
    autoOn: string;
    autoOff: string;
    hand: string;
    river: string;
    melds: string;
    exitConfirm: string;
  };
  status: {
    connected: string;
    disconnected: string;
    ping: string;
  };
}

export const CLI_LOCALES: Record<Language, CliStrings> = {
  en: {
    appTitle: 'RabiRiichi — Terminal Client',
    menu: {
      connect: 'Connect to server',
      settings: 'Settings',
      replay: 'View replay',
      quit: 'Quit',
    },
    tileMode: {
      prompt: 'Do these mahjong tiles display correctly?',
      unicode: 'Unicode tiles',
      ascii: 'ASCII tiles',
      hint: 'If the Unicode row looks garbled, choose ASCII.',
      change: 'Tile display',
    },
    language: 'Language',
    animationSpeed: 'Animation speed',
    keys: {
      move: 'move',
      select: 'select',
      back: 'back',
      quit: 'quit',
      confirm: 'confirm',
      chat: 'chat',
      auto: 'auto-play',
      riichi: 'riichi',
    },
    connect: {
      mode: 'How would you like to connect?',
      login: 'Log in',
      register: 'Register',
      server: 'Server address',
      connecting: 'Connecting…',
      savedFound: 'Saved session found — reconnecting…',
    },
    lobby: {
      heading: 'Lobby',
      roomIdPrompt: 'Room ID (1000-9999)',
      addAiType: 'Choose AI type',
    },
    config: {
      title: 'Room Configuration',
      create: 'Create room',
      hint: '↑↓ field · ←/→ change · Enter create · Esc cancel',
    },
    game: {
      yourTurn: 'Your turn',
      waiting: 'Waiting for other players…',
      chooseTile: 'Choose a tile to discard',
      chooseGroup: 'Choose a tile group',
      riichiSelect: 'Riichi: choose the tile to discard',
      autoOn: 'ON',
      autoOff: 'off',
      hand: 'Hand',
      river: 'River',
      melds: 'Melds',
      exitConfirm: 'Exit the game? (y/n)',
    },
    status: {
      connected: 'Connected',
      disconnected: 'Disconnected',
      ping: 'ping',
    },
  },
  zhs: {
    appTitle: 'RabiRiichi — 终端客户端',
    menu: {
      connect: '连接服务器',
      settings: '设置',
      replay: '查看牌谱',
      quit: '退出',
    },
    tileMode: {
      prompt: '这些麻将牌显示正常吗？',
      unicode: 'Unicode 麻将牌',
      ascii: 'ASCII 字符牌',
      hint: '如果 Unicode 行显示乱码，请选择 ASCII。',
      change: '牌面显示',
    },
    language: '语言',
    animationSpeed: '动画速度',
    keys: {
      move: '移动',
      select: '选择',
      back: '返回',
      quit: '退出',
      confirm: '确认',
      chat: '聊天',
      auto: '托管',
      riichi: '立直',
    },
    connect: {
      mode: '选择连接方式',
      login: '登录',
      register: '注册',
      server: '服务器地址',
      connecting: '连接中…',
      savedFound: '发现已保存的会话 — 正在重连…',
    },
    lobby: {
      heading: '大厅',
      roomIdPrompt: '房间号 (1000-9999)',
      addAiType: '选择 AI 类型',
    },
    config: {
      title: '房间配置',
      create: '创建房间',
      hint: '↑↓ 选项 · ←/→ 修改 · Enter 创建 · Esc 取消',
    },
    game: {
      yourTurn: '轮到你了',
      waiting: '等待其他玩家…',
      chooseTile: '选择要打出的牌',
      chooseGroup: '选择牌组',
      riichiSelect: '立直：选择要打出的牌',
      autoOn: '开',
      autoOff: '关',
      hand: '手牌',
      river: '牌河',
      melds: '副露',
      exitConfirm: '退出游戏？(y/n)',
    },
    status: {
      connected: '已连接',
      disconnected: '已断开',
      ping: '延迟',
    },
  },
  ja: {
    appTitle: 'RabiRiichi — ターミナルクライアント',
    menu: {
      connect: 'サーバーに接続',
      settings: '設定',
      replay: 'リプレイを見る',
      quit: '終了',
    },
    tileMode: {
      prompt: 'これらの麻雀牌は正しく表示されていますか？',
      unicode: 'Unicode 牌',
      ascii: 'ASCII 牌',
      hint: 'Unicode 行が乱れて見える場合は ASCII を選んでください。',
      change: '牌の表示',
    },
    language: '言語',
    animationSpeed: 'アニメーション速度',
    keys: {
      move: '移動',
      select: '選択',
      back: '戻る',
      quit: '終了',
      confirm: '決定',
      chat: 'チャット',
      auto: '自動',
      riichi: 'リーチ',
    },
    connect: {
      mode: '接続方法を選んでください',
      login: 'ログイン',
      register: '登録',
      server: 'サーバーアドレス',
      connecting: '接続中…',
      savedFound: '保存されたセッションを検出 — 再接続中…',
    },
    lobby: {
      heading: 'ロビー',
      roomIdPrompt: 'ルームID (1000-9999)',
      addAiType: 'AIの種類を選択',
    },
    config: {
      title: 'ルーム設定',
      create: 'ルームを作成',
      hint: '↑↓ 項目 · ←/→ 変更 · Enter 作成 · Esc キャンセル',
    },
    game: {
      yourTurn: 'あなたの番です',
      waiting: '他のプレイヤーを待っています…',
      chooseTile: '捨てる牌を選んでください',
      chooseGroup: '牌のグループを選択',
      riichiSelect: 'リーチ：捨てる牌を選択',
      autoOn: 'ON',
      autoOff: 'off',
      hand: '手牌',
      river: '河',
      melds: '鳴き',
      exitConfirm: 'ゲームを終了しますか？(y/n)',
    },
    status: {
      connected: '接続済み',
      disconnected: '切断',
      ping: 'ping',
    },
  },
};
