import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { TileImage } from '../resource';
import { Sleep } from '../util/timer';
import { IObserve } from './interface';

class AppInitWorker {
  private readonly initList = [TileImage];
  public currentWorkerIndex = 0;
  public totalWorkerCount = this.initList.length;
  public onFinish: () => void;

  public constructor() {
    this.onFinish = () => undefined;
    makeAutoObservable(this);
  }

  public get currentWorker(): string {
    if (this.isFinished) {
      return 'Finished';
    }
    return this.initList[this.currentWorkerIndex].serviceName;
  }

  public get isFinished(): boolean {
    return this.currentWorkerIndex === this.totalWorkerCount;
  }

  public get progress(): number {
    return (this.currentWorkerIndex + 1) / this.totalWorkerCount;
  }

  public nextWorker(): void {
    if (!this.isFinished) {
      this.currentWorkerIndex++;
      if (this.isFinished) {
        void Sleep(200).then(() => this.onFinish());
      }
    }
  }

  public async start(): Promise<void> {
    for (let i = 0; i < this.totalWorkerCount; i++) {
      const worker = this.initList[i];
      await worker.init();
      this.nextWorker();
    }
  }
}

interface AppInitProps extends IObserve<AppInitWorker> {
  onFinish: () => void;
}

function AppInit({ data, onFinish }: AppInitProps) {
  useEffect(() => {
    data.onFinish = onFinish;
  }, [onFinish]);

  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={!data.isFinished}
    >
      <Stack direction="column" alignItems="center" spacing={2}>
        <CircularProgress
          value={data.progress * 100}
          variant="determinate"
          color="primary"
        />
        <Typography>
          {data.isFinished
            ? 'Finished!'
            : `Init ${data.currentWorker}... (${
                data.currentWorkerIndex + 1
              } / ${data.totalWorkerCount})`}
        </Typography>
      </Stack>
    </Backdrop>
  );
}

export default observer(AppInit);
export const AppInitWorkerInstance = new AppInitWorker();
