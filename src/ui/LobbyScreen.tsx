import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rabiriichi } from '../net/client';
import { useSelf } from '../state/store';
import { DEFAULT_ACTION_TIMEOUT } from '../domain/constants';
import './ui.css';

interface PolicyOption {
  value: number;
  labelKey: string;
}

const RENCHAN_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.renchan.dealerWin' },
  { value: 2, labelKey: 'advanced.renchan.dealerTenpai' },
  { value: 4, labelKey: 'advanced.renchan.endGameRyuukyoku' },
  { value: 8, labelKey: 'advanced.renchan.midGameRyuukyoku' },
];

const END_GAME_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.endGame.pointsOutOfRange' },
  { value: 2, labelKey: 'advanced.endGame.instantPointsOutOfRange' },
  { value: 4, labelKey: 'advanced.endGame.dealerTenpai' },
  { value: 8, labelKey: 'advanced.endGame.dealerAgari' },
  { value: 16, labelKey: 'advanced.endGame.extendedRound' },
];

const KUIKAE_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.kuikae.genbutsu' },
  { value: 2, labelKey: 'advanced.kuikae.suji' },
];

const RIICHI_POLICIES: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.riichi.sufficientPoints' },
  { value: 2, labelKey: 'advanced.riichi.validPoints' },
  { value: 4, labelKey: 'advanced.riichi.sufficientTiles' },
];

const DORA_OPTIONS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.dora.initialDora' },
  { value: 2, labelKey: 'advanced.dora.initialUradora' },
  { value: 4, labelKey: 'advanced.dora.kanDora' },
  { value: 8, labelKey: 'advanced.dora.kanUradora' },
  { value: 16, labelKey: 'advanced.dora.instantDaiMinKan' },
  { value: 32, labelKey: 'advanced.dora.instantKaKan' },
  { value: 64, labelKey: 'advanced.dora.instantAnKan' },
];

const AGARI_OPTIONS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.agari.kuitan' },
  { value: 2, labelKey: 'advanced.agari.pao' },
  { value: 4, labelKey: 'advanced.agari.nagashiMangan' },
  { value: 8, labelKey: 'advanced.agari.firstWinner' },
];

const RYUUKYOKU_TRIGGERS: PolicyOption[] = [
  { value: 1, labelKey: 'advanced.ryuukyoku.suufonRenda' },
  { value: 2, labelKey: 'advanced.ryuukyoku.kyuushuKyuuhai' },
  { value: 4, labelKey: 'advanced.ryuukyoku.suuchaRiichi' },
  { value: 8, labelKey: 'advanced.ryuukyoku.sanchahou' },
  { value: 16, labelKey: 'advanced.ryuukyoku.suukanSanra' },
];

interface PolicyCheckboxGroupProps {
  title: string;
  options: PolicyOption[];
  value: number;
  onChange: (newValue: number) => void;
  disabled: boolean;
  t: (key: string) => string;
}

function PolicyCheckboxGroup({
  title,
  options,
  value,
  onChange,
  disabled,
  t,
}: PolicyCheckboxGroupProps) {
  const toggleFlag = (flag: number) => {
    if ((value & flag) !== 0) {
      onChange(value & ~flag);
    } else {
      onChange(value | flag);
    }
  };

  return (
    <div className="policy-group" style={{ fontSize: '0.75rem' }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#ff9900' }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {options.map((p) => (
          <label
            key={p.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              lineHeight: '1.2',
            }}
          >
            <input
              type="checkbox"
              checked={(value & p.value) !== 0}
              onChange={() => toggleFlag(p.value)}
              disabled={disabled}
              style={{
                margin: 0,
                transform: 'scale(0.85)',
                transformOrigin: 'left center',
              }}
            />
            {t(p.labelKey)}
          </label>
        ))}
      </div>
    </div>
  );
}

export function LobbyScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const currentUser = useSelf();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Room config state
  const [playerCount, setPlayerCount] = useState(2);
  const [totalRound, setTotalRound] = useState(1);
  const [minHanInput, setMinHanInput] = useState('1');
  const [minHanError, setMinHanError] = useState<string | null>(null);
  const [actionTimeoutInput, setActionTimeoutInput] = useState(
    DEFAULT_ACTION_TIMEOUT.toString(),
  );
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // Advanced policy states (matching server defaults)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [renchanPolicy, setRenchanPolicy] = useState(11);
  const [endGamePolicy, setEndGamePolicy] = useState(31);
  const [kuikaePolicy, setKuikaePolicy] = useState(3);
  const [riichiPolicy, setRiichiPolicy] = useState(7);
  const [doraOption, setDoraOption] = useState(79);
  const [agariOption, setAgariOption] = useState(15);
  const [scoringOption, setScoringOption] = useState(15);
  const [ryuukyokuTrigger, setRyuukyokuTrigger] = useState(31);
  const [pointsDeductionPolicy, setPointsDeductionPolicy] = useState(1);

  const validateTimeout = (val: string) => {
    if (val === '') {
      setTimeoutError(null);
      return;
    }
    const seconds = parseFloat(val);
    if (isNaN(seconds) || seconds < 5 || seconds > 3600) {
      setTimeoutError(t('lobby.timeoutError'));
    } else {
      setTimeoutError(null);
    }
  };

  const validateMinHan = (val: string) => {
    if (val === '') {
      setMinHanError(null);
      return;
    }
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 13) {
      setMinHanError(t('lobby.minHanError'));
    } else {
      setMinHanError(null);
    }
  };

  const handleCreateRoom = async () => {
    setError(null);
    setIsLoading(true);

    let actionTimeout = DEFAULT_ACTION_TIMEOUT;
    if (actionTimeoutInput !== '') {
      const parsed = parseFloat(actionTimeoutInput);
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 3600) {
        actionTimeout = parsed;
      }
    }

    let minHan = 1;
    if (minHanInput !== '') {
      const parsed = parseInt(minHanInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 13) {
        minHan = parsed;
      }
    }

    try {
      await rabiriichi.createRoom({
        playerCount,
        totalRound,
        minHan,
        gameplayActionTimeout: actionTimeout,
        renchanPolicy,
        endGamePolicy,
        kuikaePolicy,
        riichiPolicy,
        doraOption,
        agariOption,
        scoringOption,
        ryuukyokuTrigger,
        pointsDeductionPolicy,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateRoom = () => {
    void handleCreateRoom();
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const roomId = parseInt(roomIdInput, 10);
    if (isNaN(roomId) || roomId < 1000 || roomId > 9999) {
      setError('Room ID must be a 4-digit number (1000-9999)');
      return;
    }

    setIsLoading(true);
    try {
      await rabiriichi.joinRoom(roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const onJoinRoom = (e: React.FormEvent) => {
    void handleJoinRoom(e);
  };

  const handleDisconnect = () => {
    rabiriichi.close();
  };

  return (
    <div className="ui-screen lobby-screen">
      <div className="ui-card lobby-card">
        {/* Header with Title and Language Switcher */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 className="ui-title" style={{ margin: 0 }}>
            {t('lobby.title')}
          </h2>
          <select
            value={i18n.language}
            onChange={(e) => void i18n.changeLanguage(e.target.value)}
            className="language-selector"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #555',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <option value="zhs">简体中文</option>
            <option value="en">English</option>
          </select>
        </div>

        {currentUser && (
          <p className="user-welcome">
            {t('lobby.welcome', { nickname: currentUser.nickname })}
          </p>
        )}

        {error && <div className="ui-error">{error}</div>}

        <div className="lobby-buttons">
          {/* Room configuration inputs */}
          <div className="room-config-panel">
            <h3>{t('lobby.roomSettings')}</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 12px',
                marginBottom: '10px',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="player-count">{t('lobby.players')}</label>
                <select
                  id="player-count"
                  value={playerCount}
                  onChange={(e) => setPlayerCount(Number(e.target.value))}
                  disabled={isLoading}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value={2}>{t('playersOpt.2')}</option>
                  <option value={3}>{t('playersOpt.3')}</option>
                  <option value={4}>{t('playersOpt.4')}</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="total-round">{t('lobby.rounds')}</label>
                <select
                  id="total-round"
                  value={totalRound}
                  onChange={(e) => setTotalRound(Number(e.target.value))}
                  disabled={isLoading}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value={1}>{t('roundsOpt.1')}</option>
                  <option value={2}>{t('roundsOpt.2')}</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="min-han">{t('lobby.minHan')}</label>
                <input
                  id="min-han"
                  type="text"
                  value={minHanInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setMinHanInput(val);
                    validateMinHan(val);
                  }}
                  disabled={isLoading}
                  placeholder="1"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                {minHanError && (
                  <span className="field-error" style={{ fontSize: '0.75rem' }}>
                    {minHanError}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="action-timeout">
                  {t('lobby.actionTimeout')}
                </label>
                <input
                  id="action-timeout"
                  type="text"
                  value={actionTimeoutInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d.]/g, '');
                    setActionTimeoutInput(val);
                    validateTimeout(val);
                  }}
                  disabled={isLoading}
                  placeholder={t('lobby.defaultPlaceholder', {
                    value: DEFAULT_ACTION_TIMEOUT,
                  })}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                {timeoutError && (
                  <span className="field-error" style={{ fontSize: '0.75rem' }}>
                    {timeoutError}
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible Advanced Policy Settings */}
            <button
              type="button"
              className="ui-button secondary-button advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                fontSize: '0.9rem',
              }}
            >
              {showAdvanced
                ? `▲ ${t('lobby.advancedSettings')}`
                : `▼ ${t('lobby.advancedSettings')}`}
            </button>

            {showAdvanced && (
              <div
                className="advanced-settings-section"
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingTop: '12px',
                  borderTop: '1px solid #333',
                  marginTop: '10px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px 16px',
                  textAlign: 'left',
                }}
              >
                <PolicyCheckboxGroup
                  title={t('advanced.renchanPolicy')}
                  options={RENCHAN_POLICIES}
                  value={renchanPolicy}
                  onChange={setRenchanPolicy}
                  disabled={isLoading}
                  t={t}
                />

                <PolicyCheckboxGroup
                  title={t('advanced.endGamePolicy')}
                  options={END_GAME_POLICIES}
                  value={endGamePolicy}
                  onChange={setEndGamePolicy}
                  disabled={isLoading}
                  t={t}
                />

                <PolicyCheckboxGroup
                  title={t('advanced.kuikaePolicy')}
                  options={KUIKAE_POLICIES}
                  value={kuikaePolicy}
                  onChange={setKuikaePolicy}
                  disabled={isLoading}
                  t={t}
                />

                <PolicyCheckboxGroup
                  title={t('advanced.riichiPolicy')}
                  options={RIICHI_POLICIES}
                  value={riichiPolicy}
                  onChange={setRiichiPolicy}
                  disabled={isLoading}
                  t={t}
                />

                <PolicyCheckboxGroup
                  title={t('advanced.doraOption')}
                  options={DORA_OPTIONS}
                  value={doraOption}
                  onChange={setDoraOption}
                  disabled={isLoading}
                  t={t}
                />

                <PolicyCheckboxGroup
                  title={t('advanced.agariOption')}
                  options={AGARI_OPTIONS}
                  value={agariOption}
                  onChange={setAgariOption}
                  disabled={isLoading}
                  t={t}
                />

                {/* Scoring Option */}
                <div className="policy-group" style={{ fontSize: '0.75rem' }}>
                  <h4
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '0.8rem',
                      color: '#ff9900',
                    }}
                  >
                    {t('advanced.scoringOption')}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    {/* 切上满贯 */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        lineHeight: '1.2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(scoringOption & 1) !== 0}
                        onChange={() => setScoringOption(scoringOption ^ 1)}
                        disabled={isLoading}
                        style={{
                          margin: 0,
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      />
                      {t('advanced.scoring.kiriageMangan')}
                    </label>

                    {/* 青天井 (Virtual checkbox, checked when Yakuman bit 2 is 0) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        lineHeight: '1.2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(scoringOption & 2) === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Enable Aotenjou: disables Yakuman and related
                            setScoringOption(scoringOption & ~2 & ~4 & ~8);
                          } else {
                            // Disable Aotenjou: forces Yakuman enabled
                            setScoringOption(scoringOption | 2);
                          }
                        }}
                        disabled={isLoading}
                        style={{
                          margin: 0,
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      />
                      {t('advanced.scoring.aotenjou')}
                    </label>

                    {/* 役满 (Bit 2) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        lineHeight: '1.2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(scoringOption & 2) !== 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScoringOption(scoringOption | 2);
                          } else {
                            // Disable Yakuman: clears Multiple & Kazoe, auto-enables Aotenjou
                            setScoringOption(scoringOption & ~2 & ~4 & ~8);
                          }
                        }}
                        disabled={isLoading}
                        style={{
                          margin: 0,
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      />
                      {t('advanced.scoring.yakuman')}
                    </label>

                    {/* 多倍役满 (Bit 4) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        lineHeight: '1.2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(scoringOption & 4) !== 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Enable Multiple: also forces Yakuman (2) enabled
                            setScoringOption(scoringOption | 4 | 2);
                          } else {
                            setScoringOption(scoringOption & ~4);
                          }
                        }}
                        disabled={isLoading || (scoringOption & 2) === 0}
                        style={{
                          margin: 0,
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      />
                      {t('advanced.scoring.multipleYakuman')}
                    </label>

                    {/* 累计役满 (Bit 8) */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        lineHeight: '1.2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(scoringOption & 8) !== 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Enable Kazoe: also forces Yakuman (2) enabled
                            setScoringOption(scoringOption | 8 | 2);
                          } else {
                            setScoringOption(scoringOption & ~8);
                          }
                        }}
                        disabled={isLoading || (scoringOption & 2) === 0}
                        style={{
                          margin: 0,
                          transform: 'scale(0.85)',
                          transformOrigin: 'left center',
                        }}
                      />
                      {t('advanced.scoring.kazoeYakuman')}
                    </label>
                  </div>
                </div>

                <PolicyCheckboxGroup
                  title={t('advanced.ryuukyokuTrigger')}
                  options={RYUUKYOKU_TRIGGERS}
                  value={ryuukyokuTrigger}
                  onChange={setRyuukyokuTrigger}
                  disabled={isLoading}
                  t={t}
                />

                {/* Points Deduction Policy */}
                <div
                  className="policy-group"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <h4
                    style={{
                      margin: '0 0 4px 0',
                      fontSize: '0.8rem',
                      color: '#ff9900',
                    }}
                  >
                    {t('advanced.pointsDeductionPolicy')}
                  </h4>
                  <select
                    value={pointsDeductionPolicy}
                    onChange={(e) =>
                      setPointsDeductionPolicy(Number(e.target.value))
                    }
                    disabled={isLoading}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #555',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value={0}>
                      {t('advanced.deduction.alwaysAllow')}
                    </option>
                    <option value={1}>
                      {t('advanced.deduction.sufficientPoints')}
                    </option>
                    <option value={2}>
                      {t('advanced.deduction.validPoints')}
                    </option>
                    <option value={3}>
                      {t('advanced.deduction.alwaysBlock')}
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onCreateRoom}
            className="ui-button primary-button"
            disabled={
              isLoading || timeoutError !== null || minHanError !== null
            }
          >
            {isLoading ? 'Processing...' : t('lobby.createRoom')}
          </button>

          <form onSubmit={onJoinRoom} className="join-section">
            <div className="form-group">
              <label htmlFor="room-id">{t('lobby.joinRoomLabel')}</label>
              <input
                id="room-id"
                type="text"
                value={roomIdInput}
                onChange={(e) =>
                  setRoomIdInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                disabled={isLoading}
                placeholder={t('lobby.joinRoomLabel')}
                pattern="\d{4}"
              />
            </div>
            <button
              type="submit"
              className="ui-button secondary-button"
              disabled={isLoading || roomIdInput.length !== 4}
            >
              {t('lobby.joinRoom')}
            </button>
          </form>

          <button
            onClick={handleDisconnect}
            className="ui-button secondary-button"
            style={{ marginTop: '12px' }}
            disabled={isLoading}
          >
            {t('lobby.disconnect')}
          </button>
        </div>
      </div>
    </div>
  );
}
