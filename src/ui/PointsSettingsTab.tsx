import { useTranslation } from 'react-i18next';

interface PointsSettingsTabProps {
  isLoading: boolean;
  initialPointsInput: string;
  setInitialPointsInput: (v: string) => void;
  initialPointsError: string | null;
  validateInitialPoints: (v: string) => void;
  finishPointsInput: string;
  setFinishPointsInput: (v: string) => void;
  finishPointsError: string | null;
  validateFinishPoints: (v: string) => void;
  upperPointsInput: string;
  setUpperPointsInput: (v: string) => void;
  upperPointsError: string | null;
  validateUpperPoints: (v: string) => void;
  riichiPointsInput: string;
  setRiichiPointsInput: (v: string) => void;
  riichiPointsError: string | null;
  validateRiichiPoints: (v: string) => void;
  honbaPointsInput: string;
  setHonbaPointsInput: (v: string) => void;
  honbaPointsError: string | null;
  validateHonbaPoints: (v: string) => void;
  ryuukyokuPoints0Input: string;
  setRyuukyokuPoints0Input: (v: string) => void;
  ryuukyokuPoints0Error: string | null;
  validateRyuukyokuPoints0: (v: string) => void;
  ryuukyokuPoints1Input: string;
  setRyuukyokuPoints1Input: (v: string) => void;
  ryuukyokuPoints1Error: string | null;
  validateRyuukyokuPoints1: (v: string) => void;
}

export function PointsSettingsTab({
  isLoading,
  initialPointsInput,
  setInitialPointsInput,
  initialPointsError,
  validateInitialPoints,
  finishPointsInput,
  setFinishPointsInput,
  finishPointsError,
  validateFinishPoints,
  upperPointsInput,
  setUpperPointsInput,
  upperPointsError,
  validateUpperPoints,
  riichiPointsInput,
  setRiichiPointsInput,
  riichiPointsError,
  validateRiichiPoints,
  honbaPointsInput,
  setHonbaPointsInput,
  honbaPointsError,
  validateHonbaPoints,
  ryuukyokuPoints0Input,
  setRyuukyokuPoints0Input,
  ryuukyokuPoints0Error,
  validateRyuukyokuPoints0,
  ryuukyokuPoints1Input,
  setRyuukyokuPoints1Input,
  ryuukyokuPoints1Error,
  validateRyuukyokuPoints1,
}: PointsSettingsTabProps) {
  const { t } = useTranslation();
  return (
    <div className="basic-settings-grid">
      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="initial-points">{t('lobby.initialPoints')}</label>
          <input
            id="initial-points"
            type="text"
            value={initialPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setInitialPointsInput(val);
              validateInitialPoints(val);
            }}
            disabled={isLoading}
            placeholder="25000"
          />
        </div>
        {initialPointsError && (
          <span className="field-error">{initialPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="finish-points">{t('lobby.finishPoints')}</label>
          <input
            id="finish-points"
            type="text"
            value={finishPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setFinishPointsInput(val);
              validateFinishPoints(val);
            }}
            disabled={isLoading}
            placeholder="30000"
          />
        </div>
        {finishPointsError && (
          <span className="field-error">{finishPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="upper-points">{t('lobby.upperPoints')}</label>
          <input
            id="upper-points"
            type="text"
            value={upperPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setUpperPointsInput(val);
              validateUpperPoints(val);
            }}
            disabled={isLoading}
            placeholder="1000000"
          />
        </div>
        {upperPointsError && (
          <span className="field-error">{upperPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="riichi-points">{t('lobby.riichiPoints')}</label>
          <input
            id="riichi-points"
            type="text"
            value={riichiPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setRiichiPointsInput(val);
              validateRiichiPoints(val);
            }}
            disabled={isLoading}
            placeholder="1000"
          />
        </div>
        {riichiPointsError && (
          <span className="field-error">{riichiPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper">
        <div className="form-group-inline">
          <label htmlFor="honba-points">{t('lobby.honbaPoints')}</label>
          <input
            id="honba-points"
            type="text"
            value={honbaPointsInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setHonbaPointsInput(val);
              validateHonbaPoints(val);
            }}
            disabled={isLoading}
            placeholder="300"
          />
        </div>
        {honbaPointsError && (
          <span className="field-error">{honbaPointsError}</span>
        )}
      </div>

      <div className="form-group-inline-wrapper double-input-wrapper">
        <div className="form-group-inline">
          <label>{t('lobby.ryuukyokuPoints')}</label>
          <div className="double-input-container">
            <input
              id="ryuukyoku-points-0"
              type="text"
              value={ryuukyokuPoints0Input}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setRyuukyokuPoints0Input(val);
                validateRyuukyokuPoints0(val);
              }}
              disabled={isLoading}
              placeholder="1000"
            />
            <span className="input-separator">/</span>
            <input
              id="ryuukyoku-points-1"
              type="text"
              value={ryuukyokuPoints1Input}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setRyuukyokuPoints1Input(val);
                validateRyuukyokuPoints1(val);
              }}
              disabled={isLoading}
              placeholder="1500"
            />
          </div>
        </div>
        {(ryuukyokuPoints0Error ?? ryuukyokuPoints1Error) && (
          <span className="field-error">
            {ryuukyokuPoints0Error ?? ryuukyokuPoints1Error}
          </span>
        )}
      </div>
    </div>
  );
}
