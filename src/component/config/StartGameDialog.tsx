import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { RiichiClient } from '../../communication/riichi-client';
import { IServerInfo, ServerList } from '../../resource/server-list';
import { Sleep } from '../../util/timer';
import { IObserve } from '../interface';

class StartGameData {
  public serverAddress = '';
  public serverAddressErrorText = '';
  public serverRoom = '';
  public serverRoomErrorText = '';
  public open = true;
  public isConnecting = false;

  public onFinish: (client: RiichiClient) => void;
  public client: RiichiClient | undefined;

  public constructor() {
    makeAutoObservable(this);
    this.onFinish = () => undefined;
  }

  public setServerAddress(value: string): void {
    this.serverAddress = value;
    this.serverAddressErrorText = '';
  }

  public setServerRoom(value: string): void {
    this.serverRoom = value;
    this.serverRoomErrorText = '';
  }

  public setIsConnecting(value: boolean): void {
    this.isConnecting = value;
  }

  public validate(): boolean {
    let isValid = true;
    if (!this.serverAddress.trim()) {
      this.serverAddressErrorText = 'Server address is required.';
      isValid = false;
    }
    if (!this.serverRoom.match(/^\d+$/)) {
      this.serverRoomErrorText = 'Invalid room number.';
      isValid = false;
    }
    return isValid;
  }

  public async connect(): Promise<void> {
    this.setIsConnecting(true);
    const client = new RiichiClient(this.serverAddress);
    if (await client.verifyServer()) {
      this.client = client;
      this.close();
    } else {
      this.serverAddressErrorText = 'Cannot connect to server.';
    }
    this.setIsConnecting(false);
  }

  public close() {
    this.open = false;
    void Sleep(200).then(() => this.onFinish(this.client!));
  }
}

function StartGameDialog({ data }: IObserve<StartGameData>) {
  const addressError = data.serverAddressErrorText;
  const roomError = data.serverRoomErrorText;
  return (
    <Dialog open={data.open}>
      <DialogTitle>Start Game</DialogTitle>
      <DialogContent>
        <Autocomplete
          freeSolo
          options={ServerList}
          onInputChange={(_e, v) => data.setServerAddress(v)}
          inputValue={data.serverAddress}
          fullWidth
          readOnly={data.isConnecting}
          getOptionLabel={(option) => option.address}
          renderOption={(props, option) => {
            const name = (option as IServerInfo).name;
            return (
              <Box component="li" {...props}>
                {name}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              autoFocus
              error={addressError !== ''}
              helperText={addressError}
              margin="dense"
              variant="standard"
              label="Server Address"
              {...params}
            />
          )}
        />
        <TextField
          InputProps={{
            readOnly: data.isConnecting,
          }}
          error={roomError !== ''}
          helperText={roomError}
          margin="dense"
          label="Room Number"
          type="number"
          value={data.serverRoom}
          onChange={(e) => data.setServerRoom(e.target.value)}
          fullWidth
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button
          disabled={data.isConnecting}
          onClick={() => {
            if (data.validate()) {
              void data.connect();
            }
          }}
        >
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default observer(StartGameDialog);
export const StartGameDialogData = new StartGameData();
