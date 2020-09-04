// import * as assert from 'assert';
const assert = require('assert');

import { describe, before, it } from 'mocha';
const expect = require('chai').expect;

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fs from 'fs';
				
import SerialPort = require('serialport');
import { connectTerminalToREPL } from '../../extension';
import { REPLParser } from '../../replParser';
import * as termCon from '../../terminalConstants';
import { ISerialDevice } from '../../SerialDevice';
import { MicroPythonREPL } from '../../microPythonREPL';
import { delay, selectMicroPythonTerm } from '../../util';
import { fail } from 'assert';
const mlog = require('mocha-logger');

// const SerialPortTest = require('serialport/test');
// const MockBinding = require('@serialport/binding-mock');

const test_port = '/dev/ttyUSB0';
const test_baud = 115200;
const test_code_folder = '/home/ladvien/micro-python-terminal/src/test/test_python/';
const logPath = '/home/ladvien/micro-python-terminal/src/test/log.txt';

suite('Extension Test Suite', async () => {

	let serialDevice: ISerialDevice = new ISerialDevice(test_port, test_baud);
	// let microPyTerm = new MicroPythonREPL(serialDevice, logPath);
	
	vscode.window.showInformationMessage('Start all tests.');

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
		const file_name = 'single_indent.py';
		describe(`getNeededBreaksAfter processes ${file_name}`, function () {
			
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + file_name, 'utf8').split('\n');

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
		const file_name = 'two_indents.py';
		describe(`getNeededBreaksAfter processes ${file_name}`, function () {
		
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + file_name, 'utf8').split('\n');

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
		const file_name = 'single_indent_then_outdent.py';
		describe(`getNeededBreaksAfter processes ${file_name}`, function () {

			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + file_name, 'utf8').split('\n');

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
		const file_name = 'empty_lines.py';
		describe(`getNeededBreaksAfter processes ${file_name}`, function () {

			var replParser = new REPLParser();
			let chunk = fs.readFileSync(test_code_folder + file_name, 'utf8');
			
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
					it('correctly sends or does not send line "' + test.args.lines[i] + '"', function (){
						assert.equal(chunk, tests[i].expected);
					});
				}
			});
		});
	});

	test('connectTerminalToREPL', () => {
		describe('Creates a PseudoTerminal named "MicroPython"', () => {
			it('replReady is true on instantiation', async () => {
				const microPyREPL = new MicroPythonREPL(serialDevice);
				microPyREPL.microPyTerm.terminal.show();
				await delay(1500);
				assert.equal(microPyREPL.replReady, true);
				microPyREPL.serialConnection.close();
			});
			it('serialConnection.connected is true on instantiation', async () => {
				const microPyREPL = new MicroPythonREPL(serialDevice);
				microPyREPL.microPyTerm.terminal.show();
				await delay(1500);
				assert.equal(microPyREPL.serialConnection.connected, true);
				microPyREPL.serialConnection.close();
			});
		});
	});


	// test('connectTerminalToREPL', () => {
	// 	describe('Creates a PseudoTerminal named "MicroPython"', () => {
	// 		it('Terminal exists', (done) => {
	// 			connectTerminalToREPL(serialDevice).then(async () => {
	// 				mlog.log('ere');
	// 				const microPythonTerm = await selectMicroPythonTerm(vscode.window.terminals);
	// 				expect(microPythonTerm.name).to.equal('MicroPython');
	// 				done();
	// 			}).catch((err) => {
	// 				fail();
	// 			});
	// 		});
	// 	});
	// });

	// test('microPythonREPL', () => {
	// 	describe('Initializes the SerialPort when loaded', () => {
	// 		it('Sets serialConnection to true.', async () => {
	// 			connectTerminalToREPL(serialDevice).then(() => {
	// 				expect(lastLine).to.equal('>>> ');
	// 				done();
	// 			}).catch((err) => {
					
	// 			});
	// 		});
	// 	});
	// });

	
	// // TODO: Finish tests.
	// test('microPythonTerminal.sendSelectedText waits until MicroPython REPL is ready.', () => {

	// 	const file_name = 'wait_for_ready.py';
	// 	describe(`sendSelectedText only sends line when REPL is ready.`, () => {

	// 		let lines = fs.readFileSync(test_code_folder + file_name, 'utf8');

	// 		// DO NOT REMOVE
	// 		// https://github.com/mochajs/mocha/issues/2407#issuecomment-467917882
	// 		it(`ensures the output from ${file_name} is print('50')0xd`, (done) => {
	// 			if (microPyTerm === undefined) {
	// 				console.log(microPyTerm);
	// 				microPyTerm = new MicroPythonREPL(serialDevice);
	// 			}
	// 			microPyTerm.clearLog();
	// 			selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
	// 				mlog.log(terminal.name);
	// 				terminal.show();
	// 				if (terminal !== undefined) {
	// 					mlog.log(microPyTerm.serialConnection.connected);
	// 					mlog.log(microPyTerm.replReady);
	// 					microPyTerm.waitForReady().then(async () => {
							
	// 						await microPyTerm.sendSelectedText(lines);
	// 						let file = fs.readFileSync(logPath);
	// 						let resultLines = file.toString().split('\n');
	// 						let secondToLastLine = resultLines[resultLines.length - 2];
	// 						let lastLine = resultLines[resultLines.length - 1];
	// 						// assert.equal('500xd', secondToLastLine);
	// 						// assert.equal(`>>> `, lastLine);
	// 						expect(lastLine).to.equal('>>> ');
	// 						done();
	// 					}).catch((err) => {
	// 						mlog.log('microPyTerm.waitForReady failed.');
	// 						fail();
	// 					});
	// 				}
	// 			}).catch((err) => {
	// 				mlog.log('Failed to selectMicroPythonTerm');
	// 				fail();
	// 			});
	// 		});
	// 	});
	// });

	// test('serialConnect.reset() forces the MicroPython device to reset.', () => {
	// 	describe(`serialConnect.reset() is executed and log file checked for welcome message`, () => {
	// 		it('Makes sure the reset() causes the MicroPython hello message to appears', async () => {

	// 			if (microPyTerm === undefined) {
	// 				console.log(microPyTerm);
	// 				microPyTerm = new MicroPythonREPL(serialDevice);
	// 			}
	// 			selectMicroPythonTerm(vscode.window.terminals).then(async (terminal) => {
	// 				if (terminal !== undefined) {
	// 					microPyTerm.waitForReady().then(async () => {
	// 						microPyTerm.clearLog();
	// 						await microPyTerm.reset();
	// 						let lines = fs.readFileSync(logPath).toString().split('\n');
	// 						assert.equal('>>> ', lines[lines.length - 1]);
	// 					}).catch((err) => {
	// 						fail();
	// 					});
	// 				}
	// 			}).catch((err) => {
	// 				fail();
	// 			});
	// 		});
	// 	});
	// });

	// test('Checks SerialPort.MockBinding is working', function()  {
	// 	describe(`Opens a mock serialport and emits data`, function() {
	// 		it('Ensures the emitter fires and checks the output.', function(done) {

	// 			const testString = 'hello';

	// 			SerialPortTest.Binding = MockBinding;
	// 			MockBinding.createPort('/dev/test', { readyData: Buffer.from(''), echo: true, record: true });
	// 			const port = new SerialPortTest('/dev/test');

	// 			port.on('data', (data: Buffer) => {
	// 				assert.equal(data.toString(), testString);
	// 				done();
	// 			});
	// 			port.on('open', () => {
	// 				port.binding.emitData(testString);
	// 			});
	// 		});
	// 	});
	// });
});
