// import * as assert from 'assert';
const assert = require('assert');
import { describe, before, it } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as ext from '../../extension';
import { REPLParser } from '../../replParser';

const test_port = '/dev/ttyUSB0';
const test_baud = '115200';
const test_code_folder = './src/test/test_python/';


suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// test('Create MicroPython terminal returns terminal.', async () => {
	// 	var term = await pyTerminal.selectMicroPythonTerm(vscode.window.terminals);
	// 	assert.equal(term.name, 'MicroPython');
	// });

	test('REPLParser.count getNumberOfSpacesAtStart returns correct number of spaces at beginning of the line.', async () => {
		describe('getNumberOfSpacesAtAtart()', function () {
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
		describe('getNumberOfSpacesAtAtart()', function () {
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
				{args: { lines: lines, currentPos:  0}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: replParser.EXEC + replParser.REDUCE_INDENT + replParser.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: replParser.EXEC},
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
				{args: { lines: lines, currentPos:  0}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: replParser.EXEC +
																  replParser.REDUCE_INDENT + 
																  replParser.REDUCE_INDENT + 
																  replParser.EXEC},
				{args: { lines: lines, currentPos:  4}, expected: replParser.EXEC},
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
				{args: { lines: lines, currentPos:  0}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: replParser.EXEC +
																  replParser.REDUCE_INDENT + 
																  replParser.EXEC },
				{args: { lines: lines, currentPos:  4}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  5}, expected: replParser.EXEC + 
																  replParser.REDUCE_INDENT + 
																  replParser.EXEC },
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
			let lines = fs.readFileSync(test_code_folder + file_name, 'utf8');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: 'def hello():\n'},
				{args: { lines: lines, currentPos:  1}, expected: `print('hello')\n`},
				{args: { lines: lines, currentPos:  2}, expected: `print('small talk')\n`},
				{args: { lines: lines, currentPos:  3}, expected: `print('goodbye')\n`},
			];

			let chunks = replParser.prepareInputChunk(lines);

			it('correctly excludes empty lines from chunks array', function(){
				assert.equal(chunks.length, 4);
			});

			tests.forEach(function (test) {
				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					it('correctly sends or does not send line "' + test.args.lines[i] + '"', function (){
						assert.equal(chunk, tests[i].expected);
					});
				}
			});
		});
	});

	// TODO: Finish tests.
	test('microPythonTerminal.sendSelectedText waits until MicroPython REPL is ready.', async () => {
		const file_name = 'wait_for_ready.py';
		describe(`getNeededBreaksAfter processes ${file_name}`, function () {

			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + file_name, 'utf8');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: 'def hello():\n'},
				{args: { lines: lines, currentPos:  1}, expected: `print('hello')\n`},
				{args: { lines: lines, currentPos:  2}, expected: `print('small talk')\n`},
				{args: { lines: lines, currentPos:  3}, expected: `print('goodbye')\n`},
			];

			let chunks = replParser.prepareInputChunk(lines);

			it('correctly excludes empty lines from chunks array', function(){
				assert.equal(chunks.length, 4);
			});

			tests.forEach(function (test) {
				for (let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					it('correctly sends or does not send line "' + test.args.lines[i] + '"', function (){
						assert.equal(chunk, tests[i].expected);
					});
				}
			});
		});
	});
	// test('prepareChunkToSend handles function definition then function call.', async () => {
	// 	// var term = await pyTerminal.selectMicroPythonTerm(vscode.window.terminals);
	// 	// var serialDevice = new SerialDevice(test_port, test_baud);
	// 	// var repl = new REPL(term, serialDevice);
	// 	var replParser = new REPLParser();

	// 	// replParser.

		
	// });

});
