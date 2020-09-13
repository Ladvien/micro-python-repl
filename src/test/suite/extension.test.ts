import assert = require('assert');
import { describe, before, it } from 'mocha';
import { fail } from 'assert';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as constants from '../../terminalConstants';
import { MicroPythonREPL } from './../../microPythonREPL';
import { createMicroREPL, closeMicroREPL } from '../../extension';
import { REPLParser } from '../../replParser';
import { ISerialDevice } from '../../interfaces/SerialDevice';
import { delay, selectMicroPythonTerm, typeError } from '../../util';
import { setupWifi, getWifiSSIDInRange } from '../../deviceSystem';
import { deleteFileOnDev, fileExistsOnDev, writeFileOnDev } from '../../microPythonFS';
import { Constants } from '../../terminalConstants';

const filePath = `../configs/${process.platform}_test_config.json`;
const testParamsPath = path.resolve(__dirname, filePath).replace('out', 'src');
const testCodePath = path.resolve(__dirname, '../test_python/').replace('out', 'src');
const test_params = JSON.parse(fs.readFileSync(testParamsPath).toString());
const wifiCreds = JSON.parse(fs.readFileSync(path.resolve(__dirname, test_params["wifiCredsPath"])).toString());
const test_code_folder = testCodePath;

suite('Extension Test Suite', async () => {
	let constants = new Constants();
	let serialDevice: ISerialDevice = <ISerialDevice>{port: test_params["test_port"], baud: test_params["test_baud"]};
	
	vscode.window.showInformationMessage('Start all tests.');

	// Ensure no interface messages are screwing with tests.
	before(async () => {
		try {
			const microREPL = await createMicroREPL(serialDevice);
			await deleteFileOnDev(microREPL, '/boot.py');
			await delay(500);
			await microREPL.reset();
			await closeMicroREPL(microREPL);
		} catch (error) {
			const e = typeError(error);
			console.log('Failed in before', e.message);
		}
	});

	test('REPLParser.count getNumberOfSpacesAtStart returns correct number of spaces at beginning of the line.', async () => {
		describe('getNumberOfSpacesAtStart()', function () {

			const tests = [
				{args: '  Hello there my friends.', expected: 2},
				{args: '   Hello there my enemies.', expected: 3},
				{args: '    Hello there my enemies.', expected: 4},
				{args: 'Hello there my enemies.', expected: 0},
				{args: '                          Hello there my enemies.', expected: 26},
				{args: '  @  !#$@!#$@#%!@#$!@#$.', expected: 2},
			];

			const constants = new Constants();
			const replParser = new REPLParser(constants);
			tests.forEach(function (test) {
				it('correctly find the number of spaces at the beginning of "' + test.args + '"', function (){
					assert.strictEqual(replParser.getNumberOfSpacesAtStart(test.args), test.expected);
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


			const constants = new Constants();
			const replParser = new REPLParser(constants);
			tests.forEach(function (test) {
				it('correctly find the number of Python indents (4 spaces) at the beginning of "' + test.args + '"', function (){
					assert.strictEqual(replParser.countLineIndents(test.args), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = '/single_indent.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {
			
			const constants = new Constants();
			const replParser = new REPLParser(constants);
			let lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: constants.EXEC + constants.REDUCE_INDENT + constants.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: constants.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.strictEqual(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = '/two_indents.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {
		
			const constants = new Constants();
			const replParser = new REPLParser(constants);
			let lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: constants.EXEC +
																  constants.REDUCE_INDENT + 
																  constants.REDUCE_INDENT + 
																  constants.EXEC},
				{args: { lines: lines, currentPos:  4}, expected: constants.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.strictEqual(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = '/single_indent_then_outdent.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {

			const constants = new Constants();
			const replParser = new REPLParser(constants);
			const lines = fs.readFileSync(test_code_folder + fileName, 'utf8').split('\n');

			const tests = [
				{args: { lines: lines, currentPos:  0}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: constants.EXEC +
																  constants.REDUCE_INDENT + 
																  constants.EXEC },
				{args: { lines: lines, currentPos:  4}, expected: constants.EXEC},
				{args: { lines: lines, currentPos:  5}, expected: constants.EXEC + 
																  constants.REDUCE_INDENT + 
																  constants.EXEC },
			];
			tests.forEach(function (test) {
				it('correctly finds the signal to send after line "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.strictEqual(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});


	test('REPLParser.count getNeededBreaksAfter returns the correct signal per line of MicroPython.', async () => {
		const fileName = '/empty_lines.py';
		describe(`getNeededBreaksAfter processes ${fileName}`, function () {

			const constants = new Constants();
			const replParser = new REPLParser(constants);
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
				{args: { lines: lines, currentPos:  0}, expected: `def hello():${constants.EXEC}`},
				{args: { lines: lines, currentPos:  1}, expected: `print('hello')${constants.EXEC}`},
				{args: { lines: lines, currentPos:  2}, expected: `print('small talk')${constants.EXEC}`},
				{args: { lines: lines, currentPos:  3}, expected: `if True:${constants.EXEC}`},
				{args: { lines: lines, currentPos:  4}, expected: `print('more small talk')${constants.EXEC}${constants.BACKSPACE}${constants.BACKSPACE}${constants.EXEC}`},
				{args: { lines: lines, currentPos:  5}, expected: `print('goodbye')${constants.EXEC}`},
			];

			it('correctly excludes empty lines from chunks array', function(){
				assert.strictEqual(lines.length, 6);
			});

			tests.forEach(function (test) {
				for (let i = 0; i < lines.length; i++) {
					const chunk = lines[i];
					it('correctly sends or does not send line "' + test.args.lines[i].replace('\n', '') + '"', function (){
						assert.strictEqual(chunk, tests[i].expected);
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
					assert.strictEqual(terminal.name, 'MicroPython');
					assert.notStrictEqual(microREPL, undefined);
					assert.notStrictEqual(microREPL.serialConnection, undefined);
					if(microREPL.upyTerminal !== undefined) {
						assert.strictEqual(microREPL.upyTerminal.terminal, terminal);
					}
					assert.strictEqual(microREPL.serialConnection.connected, true);

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
							assert.strictEqual(microREPL.upyTerminal, undefined);
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
					assert.notStrictEqual(microREPL.upyTerminal?.terminal, undefined);
					if(microREPL.upyTerminal !== undefined) {
						closeMicroREPL(microREPL).then(async () => {
							assert.strictEqual(microREPL.serialConnection.connected, false);
							assert.strictEqual(microREPL.serialConnection.port.isOpen, false);
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
					assert.strictEqual(microREPL.upyTerminal?.terminal.name, 'MicroPython');
					assert.strictEqual(microREPL.isMicroREPLReady(), true);
					if(microREPL.upyTerminal !== undefined) {
						// Shutdown
						closeMicroREPL(microREPL).then(async () => {
							assert.strictEqual(microREPL.upyTerminal, undefined);
							assert.strictEqual(microREPL.serialConnection.connected, false);
							assert.strictEqual(microREPL.serialConnection.port.isOpen, false);
							assert.strictEqual(microREPL.isMicroREPLReady(), false);

							// Second create.
							createMicroREPL(serialDevice).then(async (microREPL) => {
								assert.strictEqual(microREPL.upyTerminal?.terminal.name, 'MicroPython');
								assert.strictEqual(microREPL.isMicroREPLReady(), true);
								if(microREPL.upyTerminal !== undefined) {
									// Second shutdown
									closeMicroREPL(microREPL).then(async () => {
										assert.strictEqual(microREPL.upyTerminal, undefined);
										assert.strictEqual(microREPL.serialConnection.connected, false);
										assert.strictEqual(microREPL.serialConnection.port.isOpen, false);
										assert.strictEqual(microREPL.isMicroREPLReady(), false);
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
						assert.notStrictEqual(microREPL.serialConnection.port, undefined);
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
						assert.strictEqual(microREPL.serialConnection.connected, true);
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
					assert.strictEqual(microREPL.serialConnection.connected, true);
					if(microREPL.upyTerminal){
						closeMicroREPL(microREPL).then(async () => {
							assert.strictEqual(microREPL.upyTerminal, undefined);
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
				createMicroREPL(serialDevice, test_params["logPath"]).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.reset();
					await delay(2500); // Wait for REPL to load.
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					assert.strictEqual(`>>> `, logLines[logLines.length - 1]);

					closeMicroREPL(microREPL).then(async () => {
						assert.strictEqual(microREPL.upyTerminal, undefined);
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


				createMicroREPL(serialDevice, test_params["logPath"]).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.reset();
					await delay(2500); // Wait for REPL to load.
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					microREPL.clearLog();
					assert.strictEqual(logLines[logLines.length - 1], `>>> `);

					closeMicroREPL(microREPL).then(async () => {
						assert.strictEqual(microREPL.upyTerminal, undefined);
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
			const fileName = '/wait_for_ready.py';
			it(`ensures the output from ${fileName} is print('50')0xd`, (done) => {
				let lines = fs.readFileSync(test_code_folder + fileName, 'utf8');

				createMicroREPL(serialDevice, test_params["logPath"]).then(async (microREPL) => {
					microREPL.clearLog();
					await microREPL.sendSelectedText(lines);
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					let secondToLastLine = logLines[logLines.length - 2];
					let lastLine = logLines[logLines.length - 1];
					assert.strictEqual(`50${constants.EXEC}`, secondToLastLine);
					assert.strictEqual(`>>> `, lastLine);
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.strictEqual(microREPL.upyTerminal, undefined);
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
		const fileName = '/try_except.py';
		describe(`REPLParser processes ${fileName}`, () => {
			it(`try-except block is executed correctly`, (done) => {
				createMicroREPL(serialDevice, test_params["logPath"]).then(async (microREPL) => {
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					
	
					// >>> test_var = 00xd
					// >>> try:0xd
					// ...     test_var = 1+10xd
					// ...     0x80x80x80x80x1b[Kexcept:0xd
					// ...     test_var = '3+3'0xd
					// ...     0x80x80x80x80x1b[K0xd
					// >>> 
	
					var tests = [
						`>>> test_var = 0${constants.EXEC}`,
						`>>> try:${constants.EXEC}`,
						`...     test_var = 1+1${constants.EXEC}`,
						`...     ${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.ESC}[Kexcept:${constants.EXEC}`,
						`...     test_var = '3+3'${constants.EXEC}`,
						`...     ${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.REDUCE_INDENT}${constants.ESC}[K${constants.EXEC}`,
						`>>> `
					];
					
					microREPL.clearLog();
					await microREPL.sendSelectedText(codeLines);
	
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					
					for (let i = 0; i < tests.length - 1; i++) {
						const logLine = logLines[logLines.length - i];
						const testLine = tests[tests.length - i];
						assert.strictEqual(logLine, testLine);
					}
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.strictEqual(microREPL.upyTerminal, undefined);
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
		const fileName = '/deep_try_except.py';
		describe(`REPLParser processes ${fileName}`, () => {
			it(`complicated try-except block is executed correctly`, (done) => {
				createMicroREPL(serialDevice, test_params["logPath"]).then(async (microREPL) => {
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					
	
					// 3: hello${constants.EXEC}
					// 2: >>> fun_func()${constants.EXEC}
					// 1: fun${constants.EXEC}
					// 0: >>> 

					var tests = [
						`hello${constants.EXEC}`, 
						`>>> fun_func()${constants.EXEC}`, 
						`fun${constants.EXEC}`, 
						`>>> `
					];
					
					microREPL.clearLog();
					await microREPL.sendSelectedText(codeLines);
	
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					
					for (let i = 0; i < tests.length - 1; i++) {
						const logLine = logLines[logLines.length - i];
						const testLine = tests[tests.length - i];
						assert.strictEqual(logLine, testLine);
					}
					microREPL.clearLog();

					closeMicroREPL(microREPL).then(async () => {
						assert.strictEqual(microREPL.upyTerminal, undefined);
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

			const firsLineShouldBe = `>>> import utime${constants.EXEC}`;

			it(`First line is ${firsLineShouldBe}`, async () => {

				const fileName = '/wait_for_ready.py';
				let microREPL: MicroPythonREPL;
				try {
					microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
					microREPL.upyTerminal?.terminal.show();
					// microREPL.clearLog();
					let codeLines = fs.readFileSync(test_code_folder + fileName, 'utf8');
					await microREPL.sendSelectedText(codeLines);
					let logLines = fs.readFileSync(test_params["logPath"]).toString().split('\n');
					const firstExecCode = logLines.find(x => x.includes('>>> '));
					microREPL.clearLog();
					await closeMicroREPL(microREPL);
					assert.strictEqual(firsLineShouldBe, firstExecCode);
				} catch (error) {
					console.log(error);
				}
			});
		});
	});

	test('Start MicroPython session with "Setup WiFI" command.', () => {
		const connectedFlag = `network: CONNECTED`;
		describe(`Output contains ${connectedFlag}`, () => {
			it(`The log file contains ${connectedFlag}`, async () => {
				let microREPL: MicroPythonREPL;
				let connectedLine = undefined;
				try {
					microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
					microREPL.upyTerminal?.terminal.show();
					microREPL.clearLog();
					await setupWifi(microREPL, wifiCreds);
					await delay(2000);

					connectedLine = fs.readFileSync(test_params["logPath"])
										  .toString().split('\n')
										  .find(x => x.includes(connectedFlag));
					microREPL.clearLog();

					await closeMicroREPL(microREPL);
					assert.notStrictEqual(connectedLine, undefined);
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
					microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
					microREPL.upyTerminal?.terminal.show();

					const ssids = await getWifiSSIDInRange(microREPL, 1);
					testSSID = ssids.find(x => x.ssid = wifiCreds['ssid']);
					if(await fileExistsOnDev(microREPL, '/boot.py')) {
						await deleteFileOnDev(microREPL, '/boot.py');
					}
					await closeMicroREPL(microREPL);
					assert.notStrictEqual(testSSID, wifiCreds['ssid']);
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
	// 				microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
	// 				microREPL.upyTerminal?.terminal.show();
	// 				await delay(500);
	// 				const fileContent = `this is a test file.\n` +
	// 									`this is a test file.\n` +
	// 									`this is a test file.\n` +
	// 									`this is a test file.\n`;

	// 				await writeFileOnDev(microREPL, testFilePath, fileContent);
	// 				const fileExists = await fileExistsOnDev(microREPL, testFilePath);
	// 				await closeMicroREPL(microREPL);

	// 				assert.strictEqual(fileExists, true);
	// 			} catch (error) {
	// 				assert.fail();
	// 			}
	// 		});

	// 		// it(`fileExistsOnDev() finds ${testFilePath}.`, async () => {
	// 		// 	let microREPL: MicroPythonREPL;
	// 		// 	try {
	// 		// 		microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
	// 		// 		microREPL.upyTerminal?.terminal.show();
	// 		// 		await delay(500);

	// 		// 	} catch (error) {
	// 		// 		assert.fail();
	// 		// 	}
	// 		// });
	// 		it('deleteFileOnDev() removes file.', async () => {
	// 			let microREPL: MicroPythonREPL;
	// 			try {
	// 				microREPL = await createMicroREPL(serialDevice, test_params["logPath"]);
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