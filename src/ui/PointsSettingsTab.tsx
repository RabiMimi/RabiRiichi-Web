import { useTranslation } from 'react-i18next';
import { Input } from './Input';
import { FORM } from './styles';

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
    <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[768px]:grid-cols-3 gap-x-4 gap-y-2.5 w-full box-border">
      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="initial-points" className={FORM.labelInline}>
            {t('lobby.initialPoints')}
          </label>
          <Input
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
            inputSize="inline"
          />
        </div>
        {initialPointsError && (
          <span className={FORM.fieldError}>{initialPointsError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="finish-points" className={FORM.labelInline}>
            {t('lobby.finishPoints')}
          </label>
          <Input
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
            inputSize="inline"
          />
        </div>
        {finishPointsError && (
          <span className={FORM.fieldError}>{finishPointsError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="upper-points" className={FORM.labelInline}>
            {t('lobby.upperPoints')}
          </label>
          <Input
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
            inputSize="inline"
          />
        </div>
        {upperPointsError && (
          <span className={FORM.fieldError}>{upperPointsError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="riichi-points" className={FORM.labelInline}>
            {t('lobby.riichiPoints')}
          </label>
          <Input
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
            inputSize="inline"
          />
        </div>
        {riichiPointsError && (
          <span className={FORM.fieldError}>{riichiPointsError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label htmlFor="honba-points" className={FORM.labelInline}>
            {t('lobby.honbaPoints')}
          </label>
          <Input
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
            inputSize="inline"
          />
        </div>
        {honbaPointsError && (
          <span className={FORM.fieldError}>{honbaPointsError}</span>
        )}
      </div>

      <div className={FORM.groupInlineWrapper}>
        <div className={FORM.groupInline}>
          <label className={FORM.labelInline}>
            {t('lobby.ryuukyokuPoints')}
          </label>
          <div className="flex items-center gap-1.5 flex-grow min-w-0">
            <Input
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
              inputSize="inline"
            />
            <span className="text-[#666] font-bold">/</span>
            <Input
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
              inputSize="inline"
            />
          </div>
        </div>
        {(ryuukyokuPoints0Error ?? ryuukyokuPoints1Error) && (
          <span className={FORM.fieldError}>
            {ryuukyokuPoints0Error ?? ryuukyokuPoints1Error}
          </span>
        )}
      </div>
    </div>
  );
}
