export class SerialDevice {
	port: String;
	baud: String;

	constructor(port: String, baud: String) {
		this.port = port;
		this.baud = baud;
	}
}