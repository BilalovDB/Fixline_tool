import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { url } from 'inspector';

export class CtrlGoDefinitionProvider implements vscode.DefinitionProvider {
	private GetProjectsInConfigFile(): string[] {
		let paths = [];
		let regexp =/proj_path = \"(.*?)\"/g;
		let workspaceFolders = vscode.workspace.workspaceFolders;
		if(workspaceFolders)
		{
			let fsPath = workspaceFolders[0].uri.fsPath;
			if (fs.existsSync(fsPath + '/config/config')) {
				let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
				let result;
				while (result = regexp.exec(fileData)) {
					paths.push(result[1])
				}
			}
		}
		return paths;
	}
	private async GetUsesProvider(document: vscode.TextDocument) {
		for (let i = 0; i < document.lineCount; i++) {
            let lineText = document.lineAt(i).text;
            if(lineText.startsWith('//')) continue;
			let regexp = /#uses\s+"(?<library>.*)"/;
			let result = regexp.exec(document.lineAt(i).text);
			let symbolsInUse;
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = this.GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						let fileData = fs.readFileSync(pathScript, 'utf8');
						// vscode.workspace.openTextDocument({language: 'ctrlpp', content: fileData}).then(
						// 	doc => {
						// 		let ctrlSymbolsCreator = new CtrlSymbolsCreator(doc);
						// 		let symbols = ctrlSymbolsCreator.GetSymbols();
						// 		symbolsInUse.push(symbols);
						// 	}
						// );
					}
				})
        	}
		}
	}
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        undefined | vscode.Location | Thenable<vscode.Location> {
			let textLine = document.lineAt(position.line).text;
			let location = undefined;
			let regexp = /#uses\s+"(?<library>.*)"/;
			let result = regexp.exec(textLine);
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = this.GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						new vscode.Position(0, 0);
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						location =  new vscode.Location(uri, range);
						return location;
					}
				});
			}
			else {
				let range = document.getWordRangeAtPosition(position);
				let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
				let textUnderCursor = document.getText(range);
				let symbols = ctrlSymbolsCreator.GetSymbols();
				//класс или функция
				for(let i = 0; i < symbols.length; i++) {
					let symbol = symbols[i];
					if(symbol.name == textUnderCursor) {
						location =  new vscode.Location(document.uri, symbol.range);
						return location;
					}
					//метод или переменная в функции
					for(let j = 0; j < symbol.children.length; j++) {
						let childSymbol = symbol.children[j];
						if(childSymbol.name == textUnderCursor) {
							location =  new vscode.Location(document.uri, childSymbol.range);
							return location;
						}
						//переменные в методе
						if(childSymbol.range.contains(position)) {
							for(let k = 0; k < childSymbol.children.length; k++) {
								let varSymbol = childSymbol.children[k];
								if(varSymbol.name == textUnderCursor) {
									location =  new vscode.Location(document.uri, varSymbol.range);
									return location;
								}
							}
						}					
					}
				}
			}
			
			return location;
    }
}