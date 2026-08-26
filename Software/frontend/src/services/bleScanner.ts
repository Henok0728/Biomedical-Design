import { BleError, BleManager, Device } from 'react-native-ble-plx';
import { BLE_CONFIG } from './bleParser';

export class BleScanner {
  private manager: BleManager;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Scans for the ESP32 mat using the predefined Service UUID.
   */
  public startScan(
    onDeviceFound: (device: Device) => void,
    onError: (error: BleError) => void
  ) {
    this.manager.startDeviceScan(
      [BLE_CONFIG.SERVICE_UUID], // Only scan for our specific ESP32 service
      null,
      (error, device) => {
        if (error) {
          onError(error);
          return;
        }
        if (device) {
          onDeviceFound(device);
        }
      }
    );
  }

  public stopScan() {
    this.manager.stopDeviceScan();
  }

  public async connectToDevice(deviceId: string): Promise<Device> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();
    return device;
  }

  public destroy() {
    this.manager.destroy();
  }
}

export const bleScanner = new BleScanner();
