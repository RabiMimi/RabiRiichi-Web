import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { UiTile } from './UiTile';
import { Button } from './Button';
import { FORM, MODAL } from './styles';
import {
  type CustomTileSet,
  loadCustomTileSets,
  saveCustomTileSets,
} from '../domain/tilesets';

interface CustomTileSetModalProps {
  onClose: () => void;
  onSaved?: (selectedId: string) => void;
}

const ALL_TILE_KEYS = [
  // Manzu
  '1m',
  '2m',
  '3m',
  '4m',
  '5m',
  'r5m',
  '6m',
  '7m',
  '8m',
  '9m',
  // Pinzu
  '1p',
  '2p',
  '3p',
  '4p',
  '5p',
  'r5p',
  '6p',
  '7p',
  '8p',
  '9p',
  // Souzu
  '1s',
  '2s',
  '3s',
  '4s',
  '5s',
  'r5s',
  '6s',
  '7s',
  '8s',
  '9s',
  // Zihai (Honors)
  '1z',
  '2z',
  '3z',
  '4z',
  '5z',
  '6z',
  '7z',
] as const;

function getDefaultCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of ALL_TILE_KEYS) {
    if (key === '5m' || key === '5p' || key === '5s') {
      counts[key] = 3;
    } else if (key === 'r5m' || key === 'r5p' || key === 'r5s') {
      counts[key] = 1;
    } else {
      counts[key] = 4;
    }
  }
  return counts;
}

export function CustomTileSetModal({
  onClose,
  onSaved,
}: CustomTileSetModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [customSets, setCustomSets] = useState<CustomTileSet[]>(() =>
    loadCustomTileSets(),
  );
  const [editingSet, setEditingSet] = useState<CustomTileSet | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorCounts, setEditorCounts] =
    useState<Record<string, number>>(getDefaultCounts());

  const handleStartCreate = () => {
    setEditingSet({
      id: '',
      name: '',
      tiles: [],
    });
    setEditorName('');
    setEditorCounts(getDefaultCounts());
  };

  const handleStartEdit = (set: CustomTileSet) => {
    setEditingSet(set);
    setEditorName(set.name);

    // Initialize counts to 0
    const counts: Record<string, number> = {};
    for (const key of ALL_TILE_KEYS) {
      counts[key] = 0;
    }
    // Count occurrences
    for (const tileStr of set.tiles) {
      if (tileStr in counts) {
        counts[tileStr] = (counts[tileStr] ?? 0) + 1;
      }
    }
    setEditorCounts(counts);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('customTileSet.deleteConfirm'))) {
      const updated = customSets.filter((s) => s.id !== id);
      saveCustomTileSets(updated);
      setCustomSets(updated);
    }
  };

  const handleIncrement = (key: string) => {
    setEditorCounts((prev) => ({
      ...prev,
      [key]: Math.min(100, (prev[key] ?? 0) + 1),
    }));
  };

  const handleDecrement = (key: string) => {
    setEditorCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] ?? 0) - 1),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorName.trim()) {
      return;
    }

    const flatTiles: string[] = [];
    for (const key of ALL_TILE_KEYS) {
      const count = editorCounts[key] ?? 0;
      for (let i = 0; i < count; i++) {
        flatTiles.push(key);
      }
    }

    const isNew = !editingSet?.id;
    const targetId = isNew ? `custom_${Date.now()}` : editingSet.id;

    const newSet: CustomTileSet = {
      id: targetId,
      name: editorName.trim(),
      tiles: flatTiles,
    };

    let updated: CustomTileSet[];
    if (isNew) {
      updated = [...customSets, newSet];
    } else {
      updated = customSets.map((s) => (s.id === targetId ? newSet : s));
    }

    saveCustomTileSets(updated);
    setCustomSets(updated);
    setEditingSet(null);
    if (onSaved) {
      onSaved(targetId);
    }
  };

  const getTotalCount = () => {
    return Object.values(editorCounts).reduce((a, b) => a + b, 0);
  };

  const renderGroup = (title: string, keys: readonly string[]) => (
    <div className="flex flex-col gap-1.5 border border-white/10 bg-white/[0.04] rounded-xl p-2.5">
      <div className="text-xs text-[#aaa] font-bold uppercase tracking-wider mb-1">
        {title}
      </div>
      <div className="grid grid-cols-5 gap-x-2 gap-y-3 sm:grid-cols-6 md:grid-cols-10">
        {keys.map((key) => {
          const count = editorCounts[key] ?? 0;
          const countColor =
            count > 0
              ? 'text-[#ff7a99] font-black text-sm'
              : 'text-white/20 font-medium text-sm';
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 bg-[#121c32]/50 border border-white/10 rounded px-1 py-1.5"
            >
              <UiTile tile={key} size="action" />
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleDecrement(key)}
                  className="size-5 flex items-center justify-center bg-white/10 hover:bg-[#ff7a99] hover:text-white border-none rounded-full cursor-pointer text-sm font-bold transition-colors select-none"
                >
                  -
                </button>
                <span className={`w-2 text-center select-none ${countColor}`}>
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => handleIncrement(key)}
                  className="size-5 flex items-center justify-center bg-white/10 hover:bg-[#ff7a99] hover:text-white border-none rounded-full cursor-pointer text-sm font-bold transition-colors select-none"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div className={MODAL.overlay}>
      <div
        className={`${MODAL.card} ${MODAL.cardDefaultLook} w-[95%] max-w-[800px] h-[90vh]`}
      >
        <div className={MODAL.header}>
          <h2 className={MODAL.title}>{t('customTileSet.title')}</h2>
          <button className={MODAL.closeButton} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {editingSet ? (
          // Editor View
          <form
            onSubmit={handleSave}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className={`${MODAL.body} flex-1 overflow-y-auto pr-1`}>
              <div className={FORM.group}>
                <label className={FORM.label}>
                  {t('customTileSet.nameLabel')}
                </label>
                <input
                  type="text"
                  className={FORM.input}
                  placeholder={t('customTileSet.namePlaceholder')}
                  value={editorName}
                  onChange={(e) => setEditorName(e.target.value)}
                  required
                />
              </div>

              <div className="text-sm font-bold text-[#ff7a99] mt-2 mb-1">
                {t('customTileSet.totalCount', { count: getTotalCount() })}
              </div>

              <div className="flex flex-col gap-3">
                {renderGroup(
                  t('customTileSet.manzu'),
                  ALL_TILE_KEYS.filter((k) => k.endsWith('m')),
                )}
                {renderGroup(
                  t('customTileSet.pinzu'),
                  ALL_TILE_KEYS.filter((k) => k.endsWith('p')),
                )}
                {renderGroup(
                  t('customTileSet.souzu'),
                  ALL_TILE_KEYS.filter((k) => k.endsWith('s')),
                )}
                {renderGroup(
                  t('customTileSet.zihai'),
                  ALL_TILE_KEYS.filter((k) => k.endsWith('z')),
                )}
              </div>
            </div>

            <div
              className={
                MODAL.footer + ' gap-2 border-t border-[#444] pt-2 mt-2'
              }
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditingSet(null)}
              >
                {t('customTileSet.cancel')}
              </Button>
              <Button variant="primary" type="submit">
                {t('customTileSet.save')}
              </Button>
            </div>
          </form>
        ) : (
          // List View
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-sm text-[#aaa] font-bold">
                {t('customTileSet.listTitle')}
              </span>
              <Button
                variant="primary"
                size="compact"
                onClick={handleStartCreate}
              >
                {t('customTileSet.createNew')}
              </Button>
            </div>

            <div className={`${MODAL.body} flex-1 overflow-y-auto pr-1`}>
              {customSets.length === 0 ? (
                <div className="text-[#666] text-center py-8">
                  {t('customTileSet.noSets')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {customSets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 hover:border-white/20 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-base">
                          {set.name}
                        </span>
                        <span className="text-xs text-[#aaa] mt-0.5">
                          {t('customTileSet.totalCount', {
                            count: set.tiles.length,
                          })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => handleStartEdit(set)}
                        >
                          {t('customTileSet.edit')}
                        </Button>
                        <Button
                          variant="secondary"
                          size="compact"
                          className="hover:bg-red-900/40 hover:text-red-300 hover:border-red-500/50"
                          onClick={() => handleDelete(set.id)}
                        >
                          {t('customTileSet.delete')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={MODAL.footer + ' border-t border-[#444] pt-2 mt-2'}>
              <Button variant="secondary" onClick={onClose}>
                {t('customTileSet.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
