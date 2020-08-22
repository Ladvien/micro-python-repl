export class ISerialDevice {
	port: string;
	baud: number;

	constructor(port: string, baud: number) {
		this.port = port;
		this.baud = baud;
	}
}