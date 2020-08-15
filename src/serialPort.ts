import * as vscode from 'vscode';
import { showQuickPick } from './userInput';
import { REPL } from './repl';
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

export class SerialDevice {
	
	port: String;
	baud: String;

	constructor(port: String, baud: String) {
		this.port = port;
		this.baud = baud;
	}

}

function readAvailablePorts(serialPort: typeof SerialPort)  {
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

async function selectPort(serialPort: typeof SerialPort): Promise<String> {
	return new Promise((resolve, reject) => {
		readAvailablePorts(serialPort).then((paths) => {
			resolve(showQuickPick(paths, 'No USB devices found.'));
		}).catch((err) => {
			reject(['Error finding device.']);
		});
	});
}

async function selectBaud(): Promise<String>{
    return new Promise((resolve) => {
        resolve(showQuickPick(baudRates, 'Unable to find baud rates.'));
    });
}

export async function selectDevice(): Promise<SerialDevice> {

	return new Promise((resolve, reject) => {
		selectPort(SerialPort).then((port) => {
			selectBaud().then(async (baud) => {
				resolve(new SerialDevice(port, baud));
			}).catch(() => {
				reject("Failed to select baud.");
			});
		}).catch(() => {
			reject("Failed to select port path.");
		});
	});
}

export async function useDeviceToConnectToRepl(context: vscode.ExtensionContext, terminal: vscode.Terminal): Promise<REPL> {
	return new Promise(async (resolve, reject) => {

		var port = <string>context.workspaceState.get(PORT_PATH_KEY);
		var baud = <string>context.workspaceState.get(BAUD_RATE_KEY);

		if (undefined === port && undefined === baud) {
			selectDevice().then(async (serialDevice) => {
				const repl = new REPL(terminal, port, baud);
				context.workspaceState.update(PORT_PATH_KEY, port);
				context.workspaceState.update(BAUD_RATE_KEY, baud);
				await repl.connect();
				resolve(repl);
			}).catch((err) => {
				reject(err);
			});
		} else {
			const repl = new REPL(terminal, port, baud);
			await repl.connect();
			resolve(repl);
		}
		reject('Unable to connect to MicroPython REPL.');
	});
}