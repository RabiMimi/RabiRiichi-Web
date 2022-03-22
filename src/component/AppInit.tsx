import { Backdrop, CircularProgress, Stack, Typography } from '@mui/material';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { TileImage } from '../resource';

class AppInitWorker {
  private readonly initList = [TileImage, TileImage, TileImage];
  public currentWorkerIndex = 0;
  public totalWorkerCount = this.initList.length;

  public constructor() {
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

interface AppInitProps {
  worker: AppInitWorker;
}

function AppInit({ worker }: AppInitProps) {
  return (
    <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={!worker.isFinished}
    >
      <Stack direction="column" alignItems="center" spacing={2}>
        <CircularProgress
          value={worker.progress * 100}
          variant="determinate"
          color="primary"
        />
        <Typography>
          {worker.isFinished
            ? 'Finished!'
            : `Init ${worker.currentWorker}... (${
                worker.currentWorkerIndex + 1
              } / ${worker.totalWorkerCount})`}
        </Typography>
      </Stack>
    </Backdrop>
  );
}

export default observer(AppInit);
export const AppInitWorkerInstance = new AppInitWorker();
