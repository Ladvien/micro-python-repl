// import * as assert from 'assert';
const assert = require('assert');
import { describe, before, it } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as ext from '../../extension';
import * as pyTerminal from '../../pyTerminal';
import { REPL } from '../../repl';
import { REPLParser } from '../../replParser';
import { SerialDevice } from '../../SerialDevice';

const test_port = '/dev/ttyUSB0';
const test_baud = '115200';
const test_code_folder = './src/test/test_python/';


suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Create MicroPython terminal returns terminal.', async () => {
		var term = await pyTerminal.selectMicroPythonTerm(vscode.window.terminals);
		assert.equal(term.name, 'MicroPython');
	});

	test('REPLParser.count getNumberOfSpacesAtStart returns correct number of spaces at beginning of the line.', async () => {
		// var term = await pyTerminal.selectMicroPythonTerm(vscode.window.terminals);
		// var serialDevice = new SerialDevice(test_port, test_baud);
		// var repl = new REPL(term, serialDevice);

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

	test('REPLParser.count getNeededBreaksAfter returns the correct number "break" signals for a chunk of MicroPython code.', async () => {
		describe('getNumberOfSpacesAtAtart()', function () {
			
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + 'single_indent.py', 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: replParser.REDUCE_INDENT + replParser.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: replParser.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly find the number of Python line breaks after \n "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.equal(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
			});
		});
	});

	test('REPLParser.count getNeededBreaksAfter returns the correct number "break" signals for a chunk of MicroPython code.', async () => {
		describe('getNumberOfSpacesAtAtart()', function () {
			
			var replParser = new REPLParser();
			let lines = fs.readFileSync(test_code_folder + 'two_indents.py', 'utf8').split('\n');

			var tests = [
				{args: { lines: lines, currentPos:  0}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  1}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  2}, expected: replParser.EXEC},
				{args: { lines: lines, currentPos:  3}, expected: replParser.REDUCE_INDENT + replParser.REDUCE_INDENT + replParser.EXEC},
				{args: { lines: lines, currentPos:  4}, expected: replParser.EXEC},
			];
			tests.forEach(function (test) {
				it('correctly find the number of Python line breaks after \n "' + test.args.lines[test.args.currentPos] + '"', function (){
					assert.equal(replParser.getNeededBreaksAfter(test.args.lines, test.args.currentPos), test.expected);
				});
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

	// TODO: Test decrease indent.
	// def map_val(x, in_min, in_max, out_min, out_max):
    // 		return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
	// print("Test")

	// TODO: Test indent twice, reduces by one indent only.
	// `def measure(tof: ADXL345, num_samples: int, round_num: int) -> int:
    // global vol_cof
    // samples = []    
    // # if len(samples) >= NUM_SAMPLES + 1: samples.pop(0)
    // for i in range(num_samples):
    //     samples.append(tof.read())
    //     dist = sum(samples) / len(samples) * vol_cof
    // dist = map_val(dist, empty_val, full_val, 0, OZ_FULL) # <--- test is here.
    // return round(dist, round_num)`;

});
