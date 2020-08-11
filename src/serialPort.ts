

import { showQuickPick } from './userInput';
const SerialPort = require('serialport');

const baudRates = [
    1200, 
    2400, 
    4800,
    9600, 
    19200, 
    38400, 
    57600,
    115200
]

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

export async function selectPort(serialPort: typeof SerialPort): Promise<String> {
	return new Promise((resolve, reject) => {
		readAvailablePorts(serialPort).then((paths) => {
			resolve(showQuickPick(paths, 'No USB devices found.'));
		}).catch((err) => {
			reject(['Error finding device.'])
		});
	});
}

export async function selectBaud(): Promise<String>{
    return new Promise((resolve) => {
        resolve(showQuickPick(baudRates, 'Unable to find baud rates.'));
    });
}