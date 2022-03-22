import {
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
import { IObserve } from '../interface';

class StartGameData {
  public serverAddress = '';
  public serverAddressErrorText = '';
  public serverRoom = '';
  public serverRoomErrorText = '';
  public open = true;

  public constructor() {
    makeAutoObservable(this);
  }

  public setServerAddress(value: string): void {
    this.serverAddress = value;
    this.serverAddressErrorText = '';
  }

  public setServerRoom(value: string): void {
    this.serverRoom = value;
    this.serverRoomErrorText = '';
  }

  public validate(): boolean {
    let isValid = true;
    if (!this.serverAddress.trim()) {
      this.serverAddressErrorText = 'Server address is required.';
      isValid = false;
    }
    if (!this.serverRoom.match(/^\d+$/)) {
      this.serverRoomErrorText = 'Invalid server room.';
      isValid = false;
    }
    return isValid;
  }
}

function StartGameDialog({ data }: IObserve<StartGameData>) {
  const addressError = data.serverAddressErrorText;
  const roomError = data.serverRoomErrorText;
  return (
    <Dialog open={data.open}>
      <DialogTitle>Start Game</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          error={addressError !== ''}
          helperText={addressError}
          margin="dense"
          label="Server Address"
          value={data.serverAddress}
          onChange={(e) => data.setServerAddress(e.target.value)}
          fullWidth
          variant="standard"
        />
        <TextField
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
          onClick={() => {
            if (data.validate()) {
              console.log('OK');
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
