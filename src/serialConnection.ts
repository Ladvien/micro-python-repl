import * as vscode from 'vscode';
import { showQuickPick } from './userInput';
import { REPL } from './repl';
import { SerialDevice } from './SerialDevice';

const SerialPort = require('serialport');


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

export class SerialConnection {

	serialDevice: SerialDevice;

	constructor(serialDevice: SerialDevice) {
		this.serialDevice = serialDevice;	
	}

	readAvailablePorts(serialPort: typeof SerialPort)  {
		return new Promise<string[]>((resolve, reject) => {
			var paths = new Array<string>();
			SerialPort.list().then((ports: [any]) => {
				ports.forEach(port => {
					paths.push(port.path);
				});
				resolve(paths);
			}).catch((err: any) => {
				reject(['No devices found.']);
			});;
		});
	}
	
	async selectPort(serialPort: typeof SerialPort): Promise<String> {
		return new Promise((resolve, reject) => {
			this.readAvailablePorts(serialPort).then((paths) => {
				resolve(showQuickPick(paths, 'No USB devices found.'));
			}).catch((err) => {
				reject(['Error finding device.']);
			});
		});
	}
	
	async selectBaud(): Promise<String>{
		return new Promise((resolve) => {
			resolve(showQuickPick(baudRates, 'Unable to find baud rates.'));
		});
	}
	
	async selectDevice(): Promise<SerialDevice> {
	
		return new Promise((resolve, reject) => {
			this.selectPort(SerialPort).then((port) => {
				this.selectBaud().then(async (baud) => {
					resolve(new SerialDevice(port, baud));
				}).catch(() => {
					reject("Failed to select baud.");
				});
			}).catch(() => {
				reject("Failed to select port path.");
			});
		});
	}
}
