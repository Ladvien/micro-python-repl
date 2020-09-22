import * as vscode from 'vscode';
import { ISerialDevice } from './interfaces/SerialDevice';
import { showQuickPick } from './util';
const SerialPort = require('node-usb-native').SerialPort;

export const PORT_PATH_KEY = "port";
export const BAUD_RATE_KEY = "baud";

const baudRates = [
    1200, 
    2400, 
    4800,
    9600, 
    19200, 
    38400, 
    57600,
    115200
];

export class SerialDeviceSelector {

    constructor() {}
    
    readAvailablePorts()  {
		return new Promise<string[]>((resolve, reject) => {
			var paths = new Array<string>();
			SerialPort.list().then((ports: any[]) => {
				ports.forEach(port => {
					paths.push(port.path);
				});
				resolve(paths);
			}).catch((err: any) => {
				reject(['No devices found.']);
			});;
		});

	}
	
	async selectPort(): Promise<String> {
		return new Promise((resolve, reject) => {
			this.readAvailablePorts().then((paths) => {
				resolve(showQuickPick(<string[]>paths, 'No USB devices found.'));
			}).catch((err) => {
				reject(['Error finding device.']);
			});
		});
	}
	
	async selectBaud(): Promise<Number>{
		return new Promise((resolve) => {
			const numBaudRates = <String[]>Array.from(baudRates, x => x.toString());
			showQuickPick(numBaudRates, 'Unable to find baud rates.').then((baud) => {
				resolve(<Number>parseInt(<string>baud));
			}).catch((err) => {
				vscode.window.showErrorMessage('Unable to parse baud rate.', err);
			});
		});
	}
	
	async selectDevice(): Promise<ISerialDevice> {
		return new Promise((resolve, reject) => {
			this.selectPort().then((port) => {
				this.selectBaud().then(async (baud) => {
					resolve(<ISerialDevice>{port: <string>port, baud: <number>baud});
				}).catch(() => {
					reject("Failed to select baud.");
				});
			}).catch(() => {
				reject("Failed to select port path.");
			});
		});
	}


}