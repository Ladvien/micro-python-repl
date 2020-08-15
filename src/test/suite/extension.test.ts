// import * as assert from 'assert';
var chai = require('chai');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as ext from '../../extension';
import * as pyTerminal from '../../pyTerminal';
import * as repl from '../../repl';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Create MicroPython terminal returns terminal.', async () => {
		var term = await pyTerminal.selectMicroPythonTerm(vscode.window.terminals);
		chai.expect(term.name).to.equal('MicroPython');
	});

});
