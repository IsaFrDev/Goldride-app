import { Audio } from 'expo-av';

class SoundService {
  private newOrderSound: Audio.Sound | null = null;
  private arrivedSound: Audio.Sound | null = null;

  async init() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (e) {
      console.log('Sound init error:', e);
    }
  }

  async playNewOrder() {
    try {
      if (this.newOrderSound) {
        await this.newOrderSound.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/new_order.mp3'),
        { volume: 1.0, isLooping: true }
      );
      this.newOrderSound = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing new order sound:', e);
    }
  }

  async stopNewOrder() {
    try {
      if (this.newOrderSound) {
        await this.newOrderSound.stopAsync();
        await this.newOrderSound.unloadAsync();
        this.newOrderSound = null;
      }
    } catch (e) {
      console.log('Error stopping new order sound:', e);
    }
  }

  async playDriverArrived() {
    try {
      if (this.arrivedSound) {
        await this.arrivedSound.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/arrived.mp3'),
        { volume: 1.0 }
      );
      this.arrivedSound = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing arrived sound:', e);
    }
  }

  async unload() {
    if (this.newOrderSound) await this.newOrderSound.unloadAsync();
    if (this.arrivedSound) await this.arrivedSound.unloadAsync();
  }
}

export const soundService = new SoundService();
