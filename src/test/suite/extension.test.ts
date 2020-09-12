
import assert = require('assert');
import { describe, before, it } from 'mocha';
import { fail } from 'assert';

import * as vscode from 'vscode';
import * as fs from 'fs';

import * as termCon from '../../terminalConstants';
import { MicroPythonREPL } from './../../microPythonREPL';
import { createMicroREPL, closeMicroREPL } from '../../extension';
import { REPLParser } from '../../replParser';
import { ISerialDevice } from '../../interfaces/SerialDevice';
import { delay, selectMicroPythonTerm, typeError } from '../../util';
import { setupWifi, getWifiSSIDInRange } from '../../deviceSystem';
import { deleteFileOnDev, fileExistsOnDev, writeFileOnDev } from '../../microPythonFS';

const test_port = 'COM8';
const test_baud = 115200;
const test_code_folder = 'C:/Users/cthom/Desktop/micro-python-repl/src/test/test_python/';
const logPath = 'C:/Users/cthom/Desktop/log.txt';
const wifiCreds = JSON.parse(fs.readFileSync('C:/Users/cthom/Desktop/creds.json').toString());

suite('Extension Test Suite', async () => {

	let serialDevice: ISerialDevice = <ISerialDevice>{port: test_port, baud: test_baud};
	
	vscode.window.showInformationMessage('Start all tests.');

	// Ensure no interface messages are screwing with tests.
	before(async () => {
		try {
			const microREPL = await createMicroREPL(serialDevice);
			await deleteFileOnDev(microREPL, '/boot.py');
			await microREPL.reset();
			await closeMicroREPL(microREPL);
		} catch (error) {
			const e = typeError(error);
			console.log('Failed in before', e.message);
		}
	});

	test('REPLParser.count getNumberOfSpacesAtStart returns correct number of spaces at beginning of the line.', async () => {
		describe('getNumberOfSpacesAtStart()', function () {

			var tests = [
				{args: '  Hello there my friends.', expected: 2},
				{args: '   Hello there my enemies.', expected: 3},
				{args: '    Hello there my enemies.', expected: 4},
				{args: 'Hello there my enemies.', expected: 0},
				{args: '                          Hello there my enemies.', expected: 26},
				{args: '  @  !#$@!#$@#%!@#$!@#$.', expected: 2},
			];


			var replParser = new REPLParser();
			tests.forEach(function (test) {
				it('correctly find the number of spaces at the beginning of "' + test.args + '"', function (){
					assert.equal(replParser.getNumberOfSpacesAtStart(test.args), test.expected);
				});
			});
		});
	});

	test('REPLParser.count countLineIndents returns the correct number of line indents.', async () => {
		describe('getNumberOfSpacesAtStart()', function () {
			var tests = [
				{args: '  Hello there my friends.', expected: 0},
				{args: '   Hello there my enemies.', expected: 0},
				{args: '    Hello there my enemies.', expected: 1},
				{args: 'Hello there my enemies.', expected: 0},
				{args: '                          Hello there my enemies.', expected: 6},
				{args: '  @  !#$@!#$@#%!@#$!@#$.', expected: 0},
			];


			var replParser = new REPLParser();
			tests.forEach(function (test) {
				it('correctly find the number of Python indents (4 spaces) at the beginning of "' + test.args + '"', function (){
					assert.equal(replParser.countLineIndents(test.args), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = 'single_indent.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {
			
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: termCon.EXEC + termCon.REDUCE_INDENT + termCon.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: termCon.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.equal(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = 'two_indents.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {
		
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: termCon.EXEC +
																  termCon.REDUCE_INDENT + 
																  termCon.REDUCE_INDENT + 
																  termCon.EXEC},
				{args: { lines: lines, currentPos:  4}, expected: termCon.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.equal(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = 'single_indent_then_outdent.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {

			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: termCon.EXEC +
																  termCon.REDUCE_INDENT + 
																  termCon.EXEC },
				{args: { lines: lines, currentPos:  4}, expected: termCon.EXEC},
				{args: { lines: lines, currentPos:  5}, expected: termCon.EXEC + 
																  termCon.REDUCE_INDENT + 
																  termCon.EXEC },
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.equal(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});


	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = 'empty_lines.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {

			var replParser = new REPLParser();
			let chunk = fs.readFileSync(test_code_folder + fileName, 'utf8');
			
			let lines = replParser.prepareInputChunk(chunk);

			// def hello():0xd
			// print('hello')0xd
			// print('small talk')0xd
			// if True:0xd
			// print('more small talk')0xd
			// 0x7f0x7f0xd
			// print('goodbye')0xd

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: `def hello():${termCon.EXEC}`},
				{args: { lines: lines, currentPos:  1}, expected: `print('hello')${termCon.EXEC}`},
				{args: { lines: lines, currentPos:  2}, expected: `print('small talk')${termCon.EXEC}`},
				{args: { lines: lines, currentPos:  3}, expected: `if True:${termCon.EXEC}`},
				{args: { lines: lines, currentPos:  4}, expected: `print('more small talk')${termCon.EXEC}${termCon.BACKSPACE}${termCon.BACKSPACE}${termCon.EXEC}`},
				{args: { lines: lines, currentPos:  5}, expected: `print('goodbye')${termCon.EXEC}`},
			];

			it('correctly excludes empty lines from chunks array', function(){
				assert.equal(lines.length, 6);
			});

			tests.forEach(function (test) {
				for (let i = 0; i < lines.length; i++) {
					const chunk = lines[i];
					it('correctly sends or does not send line "' + test.args.lines[i].replace('\n', '') + '"', function (){
						assert.equal(chunk, tests[i].expected);
					});
				}
			});
		});
	});

	test('connectTerminalToREPL', () => {
		describe('Creates a PseudoTerminal named "MicroPython"', () => {
			it('Terminal exists', function (done) {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					const terminal = await selectMicroPythonTerm(vscode.window.terminals);
					terminal.show();
					assert.equal(terminal.name, 'MicroPython');
					assert.notEqual(microREPL, undefined);
					assert.notEqual(microREPL.serialConnection, undefined);
					if(microREPL.upyTerminal !== undefined) {
						assert.equal(microREPL.upyTerminal.terminal, terminal);
					}
					assert.equal(microREPL.serialConnection.connected, true);

					// Shutdown
					closeMicroREPL(microREPL).then(async (terminal) => {
						done();
					}).catch((err) => {
						fail(err);
					});
				}).catch((err) => {
					fail();
				});
			});
			it('closeTerm() causes terminal to be disposed after short delay', function (done) {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					if(microREPL.upyTerminal){
						closeMicroREPL(microREPL).then(async () => {
							assert.equal(microREPL.upyTerminal, undefined);
							done();
						}).catch((err) => {
							fail(err);
						});
					} else {
						fail();
					}
				}).catch((err) => {
					fail(err);
				});
			});
			it('closeTerm() causes SerialPort connection to be closed', function (done) {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					assert.notEqual(microREPL.upyTerminal?.terminal, undefined);
					if(microREPL.upyTerminal !== undefined) {
						closeMicroREPL(microREPL).then(async () => {
							assert.equal(microREPL.serialConnection.connected, false);
							assert.equal(microREPL.serialConnection.port.isOpen, false);
							done();
						}).catch((err) => {
							fail(err);
						});
					}
				}).catch((err) => {
					fail(err);
				});
			});
			it('Create new MicroPython terminal after deactivate()', function (done) {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					assert.equal(microREPL.upyTerminal?.terminal.name, 'MicroPython');
					assert.equal(microREPL.isMicroREPLReady(), true);
					if(microREPL.upyTerminal !== undefined) {
						// Shutdown
						closeMicroREPL(microREPL).then(async () => {
							assert.equal(microREPL.upyTerminal, undefined);
							assert.equal(microREPL.serialConnection.connected, false);
							assert.equal(microREPL.serialConnection.port.isOpen, false);
							assert.equal(microREPL.isMicroREPLReady(), false);

							// Second create.
							createMicroREPL(serialDevice).then(async (microREPL) => {
								assert.equal(microREPL.upyTerminal?.terminal.name, 'MicroPython');
								assert.equal(microREPL.isMicroREPLReady(), true);
								if(microREPL.upyTerminal !== undefined) {
									// Second shutdown
									closeMicroREPL(microREPL).then(async () => {
										assert.equal(microREPL.upyTerminal, undefined);
										assert.equal(microREPL.serialConnection.connected, false);
										assert.equal(microREPL.serialConnection.port.isOpen, false);
										assert.equal(microREPL.isMicroREPLReady(), false);
										done();
									}).catch((err) => {
										fail(err);
									});
								}
							}).catch((err) => {
								fail(err);
							});
							// End second

						}).catch((err) => {
							fail(err);
						});
					}
				}).catch((err) => {
					fail(err);
				});
			});
		});
	});
	

	test('microPythonREPL', () => {
		describe('Initializes the SerialPort when loaded', () => {
			it('replReady is true on instantiation', (done) => {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					if(microREPL.upyTerminal){
						assert.notEqual(microREPL.serialConnection.port, undefined);
						closeMicroREPL(microREPL).then(async () => {
							done();
						}).catch((err) => {
							fail(err);
						});
					} else {
						fail();
					}
				}).catch((err) => {
					fail(err);
				});
			});
			it('serialConnection.connected is true on instantiation', (done) => {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					if(microREPL.upyTerminal){
						assert.equal(microREPL.serialConnection.connected, true);
						closeMicroREPL(microREPL).then(async () => {
							done();
						}).catch((err) => {
							fail(err);
						});
					} else {
						fail();
					}
				}).catch((err) => {
					fail(err);
				});
			});

			it('Sets serialConnection to true.', (done) => {
				createMicroREPL(serialDevice).then(async (microREPL) => {
					assert.equal(microREPL.serialConnection.connected, true);
					if(microREPL.upyTerminal){
						closeMicroREPL(microREPL).then(async () => {
							assert.equal(microREPL.upyTerminal, undefined);
							done();
						}).catch((err) => {
							fail(err);
						});
					} else {
						fail();
					}
				}).catch((err) => {
					fail(err);
				});
			});
		});
	});

	test('serialConnect.reset() forces the MicroPython device to reset.', () => {
		describe(`serialConnect.reset() is executed and log file checked for welcome message`, () => {
			it('Makes sure the reset() causes the MicroPython hello message to appears', (done) => {
				createMicroREPL(serialDevice, logPath).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.reset();
					await delay(2500); // Wait for REPL to load.
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					assert.equal(`>>> `, logLines[logLines.length - 1]);

					closeMicroREPL(microREPL).then(async () => {
						assert.equal(microREPL.upyTerminal, undefined);
						done();
					}).catch((err) => {
						fail(err);
					});
	
				}).catch((err) => {
					fail(err);
				});
				

			});
		});
	});

	test('No saved port and baud cause error message to show.', () => {
		describe(`Create MicroPython terminal without setting baud or serial.`, () => {
			it('Ensure error message shows.', (done) => {


				createMicroREPL(serialDevice, logPath).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.reset();
					await delay(2500); // Wait for REPL to load.
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					microREPL.clearLog();
					assert.equal(`>>> `, logLines[logLines.length - 1]);

					closeMicroREPL(microREPL).then(async () => {
						assert.equal(microREPL.upyTerminal, undefined);
						done();
					}).catch((err) => {
						fail(err);
					});
	
				}).catch((err) => {
					fail(err);
				});
				

			});
		});
	});

	test('microPythonTerminal.sendSelectedText waits until MicroPython REPL is ready.', () => {
		describe(`sendSelectedText only sends line when REPL is ready.`, () => {
			// DO NOT REMOVE
			// https://github.com/mochajs/mocha/issues/2407#issuecomment-467917882
			const fileName = 'wait_for_ready.py';
			it(`ensures the output from ${fileName} is print('50')0xd`, (done) => {
				let lines = fs.readFileSync(test_code_folder + fileName, 'utf8');

				createMicroREPL(serialDevice, logPath).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.sendSelectedText(lines);
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					let secondToLastLine = logLines[logLines.length - 2];
					let lastLine = logLines[logLines.length - 1];
					assert.equal('500x0d ', secondToLastLine);
					assert.equal(`>>> `, lastLine);
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.equal(microREPL.upyTerminal, undefined);
						done();
					}).catch((err) => {
						fail(err);
					});
	
				}).catch((err) => {
					fail(err);
				});
			});
		});
	});


	test('REPLParser handles try-except blocks', () => {
		const fileName = 'try_except.py';
		describe(`REPLParser processes ${fileName}`, () => {
			it(`try-except block is executed correctly`, (done) => {
				createMicroREPL(serialDevice, logPath).then(async (microREPL) => {
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					
	
					// >>> test_var = 00xd
					// >>> try:0xd
					// ...     test_var = 1+10xd
					// ...     0x80x80x80x80x1b[Kexcept:0xd
					// ...     test_var = '3+3'0xd
					// ...     0x80x80x80x80x1b[K0xd
					// >>> 
	
					var tests = [
						`>>> test_var = 00x0d `,
						`>>> try:0x0d `,
						`...     test_var = 1+10x0d `,
						`...     0x08 0x08 0x08 0x08 0x1b [Kexcept:0x0d `,
						`...     test_var = '3+3'0x0d `,
						`...     0x08 0x08 0x08 0x08 0x1b [K0x0d `,
						`>>> `
					];
					
					microREPL.clearLog();
					await microREPL.sendSelectedText(codeLines);
	
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					
					for (let i = 0; i < tests.length - 1; i++) {
						const logLine = logLines[logLines.length - i];
						const testLine = tests[tests.length - i];
						assert.equal(testLine, logLine);
					}
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.equal(microREPL.upyTerminal, undefined);
						done();
					}).catch((err) => {
						fail(err);
					});
				}).catch((err) => {
					fail(err);
				});
			});
			
		});
	});

	test('REPLParser handles deep-try-except blocks', () => {
		const fileName = 'deep_try_except.py';
		describe(`REPLParser processes ${fileName}`, () => {
			it(`complicated try-except block is executed correctly`, (done) => {
				createMicroREPL(serialDevice, logPath).then(async (microREPL) => {
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					
	
					// 3: hello0x0d 
					// 2: >>> fun_func()0x0d 
					// 1: fun0x0d 
					// 0: >>> 

					var tests = [
						'hello0x0d ', 
						'>>> fun_func()0x0d ', 
						'fun0x0d ', 
						'>>> '
					];
					
					microREPL.clearLog();
					await microREPL.sendSelectedText(codeLines);
	
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					
					for (let i = 0; i < tests.length - 1; i++) {
						const logLine = logLines[logLines.length - i];
						const testLine = tests[tests.length - i];
						assert.equal(testLine, logLine);
					}
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.equal(microREPL.upyTerminal, undefined);
						done();
					}).catch((err) => {
						fail(err);
					});
				}).catch((err) => {
					fail(err);
				});
			});
			
		});
	});

	test('Send Text', () => {
		describe('Does not lose text when used on startup', () => {

			const firsLineShouldBe = `>>> import utime0x0d `;

			it(`First line is ${firsLineShouldBe}`, async () => {

				const fileName = 'wait_for_ready.py';
				let microREPL: MicroPythonREPL;
				try {
					microREPL = await createMicroREPL(serialDevice, logPath);
					microREPL.clearLog();
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					await microREPL.sendSelectedText(codeLines);
					let logLines = fs.readFileSync(logPath).toString().split('\n');
					const firstExecCode = logLines.find(x => x.includes('>>> '));
					microREPL.clearLog();
					await closeMicroREPL(microREPL);
					assert.equal(firstExecCode, firsLineShouldBe);
				} catch (error) {
					console.log(error);
				}
			});
		});
	});

	test('Start MicroPython session with "Setup WiFI" command.', () => {
		const connectedFlag = `network: CONNECTED0x1b`;
		describe(`Output contains ${connectedFlag}`, () => {
			it(`The log file contains ${connectedFlag}`, async () => {
				let microREPL: MicroPythonREPL;
				let connectedLine = undefined;
				try {
					microREPL = await createMicroREPL(serialDevice, logPath);
					microREPL.upyTerminal?.terminal.show();
					microREPL.clearLog();
					await setupWifi(microREPL, wifiCreds);
					await delay(2000);

					connectedLine = fs.readFileSync(logPath)
										  .toString().split('\n')
										  .find(x => x.includes(connectedFlag));
					microREPL.clearLog();

					await closeMicroREPL(microREPL);
					assert.notEqual(connectedLine, undefined);
				} catch (error) {
					assert.fail();
				}
			});
		});
	});

	test('getWifiSSIDInRange().', () => {
		describe(`Returns an array of SSIDs`, () => {
			it(`The test SSID is in array.`, async () => {
				let microREPL: MicroPythonREPL;
				let testSSID = undefined;
				try {
					microREPL = await createMicroREPL(serialDevice, logPath);
					microREPL.upyTerminal?.terminal.show();

					const ssids = await getWifiSSIDInRange(microREPL, 1);
					testSSID = ssids.find(x => x.ssid = wifiCreds['ssid']);
					if(await fileExistsOnDev(microREPL, '/boot.py')) {
						await deleteFileOnDev(microREPL, '/boot.py');
					}
					await closeMicroREPL(microREPL);
					assert.notEqual(testSSID, wifiCreds['ssid']);
				} catch (error) {
					assert.fail();
				}
			});
		});
	});

	// test('microPythonFS', () => {
	// 	describe('File system commands modify flash memory correctly', () => {
	// 		const testFilePath = '/test_file.txt';

	// 		it('writeFileOnDev() creates file at', async () => {
	// 			let microREPL: MicroPythonREPL;
	// 			try {
	// 				microREPL = await createMicroREPL(serialDevice, logPath);
	// 				microREPL.upyTerminal?.terminal.show();
	// 				await delay(500);
	// 				const fileContent = `this is a test file.\n` +
	// 									`this is a test file.\n` +
	// 									`this is a test file.\n` +
	// 									`this is a test file.\n`;

	// 				await writeFileOnDev(microREPL, testFilePath, fileContent);
	// 				const fileExists = await fileExistsOnDev(microREPL, testFilePath);
	// 				await closeMicroREPL(microREPL);

	// 				assert.equal(fileExists, true);
	// 			} catch (error) {
	// 				assert.fail();
	// 			}
	// 		});

	// 		// it(`fileExistsOnDev() finds ${testFilePath}.`, async () => {
	// 		// 	let microREPL: MicroPythonREPL;
	// 		// 	try {
	// 		// 		microREPL = await createMicroREPL(serialDevice, logPath);
	// 		// 		microREPL.upyTerminal?.terminal.show();
	// 		// 		await delay(500);

	// 		// 	} catch (error) {
	// 		// 		assert.fail();
	// 		// 	}
	// 		// });
	// 		it('deleteFileOnDev() removes file.', async () => {
	// 			let microREPL: MicroPythonREPL;
	// 			try {
	// 				microREPL = await createMicroREPL(serialDevice, logPath);
	// 				microREPL.upyTerminal?.terminal.show();
	// 			} catch (error) {
	// 				assert.fail();
	// 			}
	// 			if(await fileExistsOnDev(microREPL, testFilePath)) {
	// 				await deleteFileOnDev(microREPL, testFilePath);
	// 			}
	// 		});
	// 	});
	// });


});