# equationshift-js

`equationshift-js` ist ein JavaScript-Framework, durch dessen Integration in eine beliebige Webapplikation mathematische Gleichungen
mittels Gestensteuerung gelöst werden können.

## Verwendung

- Umformungsschritte werden durch Drag and Drop von Ausdrücken gebildet
  - automatische Invertierung von Operatoren
  - automatische Verkettung von Ausdrücken (`5*x*y` wird zu `-5*x*y` unabhängig davon, welcher Teilausdruck bewegt wird)
  - im unterstützenden Modus ist die Stelle, an der ein Ausdruck platziert wird, irrelevant, da der getätigte Umformungsschritt
    automatisch auf beide Gleichungsseiten angewandt wird
  - im freien Modus werden platzierte Teilausdrücke auf der Quellseite entfernt und an der festgelegten Stelle auf der Zielseite
    platziert (ein Teilausdruck wird an das Ende der Zielseite angehangen, wenn er vor oder nach dem Gesamtausdruck platziert wird)
- ein Ausdruck wird auf beiden Gleichungsseiten unverkettet dividiert, wenn er in eine Divisionszone gezogen wird
- Funktionen und Potenzen können durch einen Klick invertiert werden (z.B. Klick auf `sqrt(x)` wendet quadratische Potenz an)
- Ausdrücke auf einer Gleichungsseite werden durch das Ziehen eines Ausdrucks neben einen anderen manuell simplifiziert

## Integration

Folgende Dateien / URLs müssen in der obersten HTML-Datei (oft `index.html`) der Webapplikation verlinkt werden:
- sämtliche [Dependencies](./dependencies)

<table>
  <tr>
    <th>Dependency</th>
    <th>Datei</th>
    <th>URL</th>
  </tr>
  <tr>
    <td>jQuery</td>
    <td>[jquery.min.js](./dependencies/jquery.min.js)</td>
    <td>[https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js](https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js)</td>
  </tr>
  <tr>
    <td>Math.js</td>
    <td>[math.min.js](./dependencies/math.min.js)</td>
    <td>[https://cdn.jsdelivr.net/npm/mathjs@5.1.2/dist/math.min.js](https://cdn.jsdelivr.net/npm/mathjs@5.1.2/dist/math.min.js)</td>
  </tr>
  <tr>
    <td>Nerdamer</td>
    <td>[nerdamer.min.js](./dependencies/nerdamer.min.js)</td>
    <td>[https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js](https://cdn.jsdelivr.net/npm/nerdamer@1.1.13/all.min.js)</td>
  </tr>
  <tr>
    <td>Dragula (JS)</td>
    <td>[dragula.min.js](./dependencies/dragula.min.js)</td>
    <td>[https://cdn.jsdelivr.net/npm/dragula@3.7.2/dist/dragula.min.js](https://cdn.jsdelivr.net/npm/dragula@3.7.2/dist/dragula.min.js)</td>
  </tr>
  <tr>
    <td>Dragula (CSS)</td>
    <td>[dragula.min.css](./dependencies/dragula.min.css)</td>
    <td>[https://cdn.jsdelivr.net/npm/dragula@3.7.2/dist/dragula.min.css](https://cdn.jsdelivr.net/npm/dragula@3.7.2/dist/dragula.min.css)</td>
  </tr>
</table>

- [equationshift.js](./equationshift.js) oder [equationshift.min.js](./equationshift.min.js)
- [equationshift.css](./equationshift.css) oder [equationshift.min.css](./equationshift.min.css)

## Notwendiger Code und Anpassungen

Das Framework setzt die Existenz des folgenden Codes voraus:
- DOM-Elemente:
  - ein `ul`-Element mit der id `left-equation-part-ul` für die linke Gleichungsseite
  - ein `ul`-Element mit der id `right-equation-part-ul` für die rechte Gleichungsseite
  - ein `ul`-Element mit der id `first-division-zone-ul` für die erste Divisionszone
  - <strong>optional</strong>: ein `ul`-Element mit der id `second-division-zone-ul` für die zweite Divisionszone
- JavaScript-Code:
  - Aufruf von `EquationShiftAPI.initEquationShiftEnvironment(leftEquationPart, rightEquationPart, targetVariable, equationShiftConfig)` zur Initialisierung des Frameworks
    - `leftEquationPart` = linker Gleichungsausdruck (String)
    - `rightEquationPart` = rechter Gleichungsausdruck (String)
    - `targetVariable` = Variable, nach der die Gleichung aufgelöst werden soll (String)
    - `equationShiftConfig` = Konfigurationswerte (Object)
    - wirft `Error` bei fehlgeschlagener Gleichungsvalidierung

Sämtliche vom Framework erzeugte und genutzte DOM-Elemente können mithilfe von CSS individualisiert werden:
<table>
  <tr>
    <th>DOM-Element</th>
    <th>CSS-Selektor</th>
  </tr>
  <tr>
    <td>Bewegbarer Teilausdruck der Gleichung</td>
    <td>#left-equation-part-ul li / #right-equation-part-ul li</td>
  </tr>
  <tr>
    <td>Bruch</td>
    <td>div.fraction</td>
  </tr>
  <tr>
    <td>Zähler innerhalb eines Bruchs</td>
    <td>span.numerator</td>
  </tr>
  <tr>
    <td>Nenner innerhalb eines Bruchs</td>
    <td>span.denominator</td>
  </tr>
  <tr>
    <td>Preview-Tooltip</td>
    <td>#left-equation-part-ul[data-tooltip]:before / #right-equation-part-ul[data-tooltip]:before</td>
  </tr>
</table>

## Konfigurationen

Bei Bedarf müssen die untenstehenden Keys und deren Values in das `equationShiftConfig`-Objekt bei der Initialisierung des Frameworks eingefügt werden.

<table>
  <tr>
    <th>Key</th>
    <th>Value</th>
    <th>Beschreibung</th>
  </tr>
  <tr>
    <td>supportiveMode</td>
    <td>Boolean</td>
    <td>Unterstützender Modus (nur sinnvolle und valide Umformungsschritte) oder freier Modus (keine Einschränkungen)</td>
  </tr>
  <tr>
    <td>groupTokens</td>
    <td>Boolean</td>
    <td>Teilausdrücke als ganzes (Klammerinhalte können nicht bewegt werden) oder jeden Gleichungsbestandteil separat rendern (nahezu jeder Token ist bewegbar)</td>
  </tr>
  <tr>
    <td>autoSimplification</td>
    <td>Boolean</td>
    <td>Automatische oder manuelle Simplifizierung von Ausdrücken infolge von Umformungsschritten</td>
  </tr>
  <tr>
    <td>lockWhenSolved</td>
    <td>Boolean</td>
    <td>Drag and Drop und Klickevents ausschalten, wenn Gleichung gelöst ist</td>
  </tr>
  <tr>
    <td>showPreview</td>
    <td>Boolean</td>
    <td>Preview von Gleichungsseiten infolge von Umformungsschritten anzeigen</td>
  </tr>
  <tr>
    <td>prettifyFractions</td>
    <td>Boolean</td>
    <td>Brüche mit einem horizontalen oder diagonalen Bruchstrich darstellen</td>
  </tr>
  <tr>
    <td>checkIfEquationIsSolvable</td>
    <td>Boolean</td>
    <td>Soll die Gleichungsvalidierung die Überprüfung, ob die Gleichung lösbar ist, beinhalten?</td>
  </tr>
  <tr>
    <td>simplifyEquationShiftExpression</td>
    <td>(mathExpression) => String</td>
    <td>
      Funktion zur Simplifizierung von Ausdrücken<br><br>
      mathExpression = zu simplifizierender Ausdruck (String)
    </td>
  </tr>
  <tr>
    <td>equationIsSolvable</td>
    <td>(leftEquationPart, rightEquationPart, targetVariable) => Boolean</td>
    <td>
      Funktion zur Überprüfung, ob eine Gleichung lösbar ist<br><br>
      leftEquationPart = linker Gleichungsausdruck (String)<br>
      rightEquationPart = rechter Gleichungsausdruck (String)<br>
      targetVariable = Variable, nach der die Gleichung aufgelöst werden soll (String)
    </td>
  </tr>
</table>

## API-Funktionen

<table>
  <tr>
    <th>Funktion</th>
    <th>Rückgabewert</th>
    <th>Beschreibung</th>
  </tr>
  <tr>
    <td>EquationShiftAPI.equationIsSolved()</td>
    <td>Boolean</td>
    <td>Ist die betrachtete Gleichung gelöst?</td>
  </tr>
  <tr>
    <td>EquationShiftAPI.getCorrectEquationResults()</td>
    <td>String[]</td>
    <td>Gibt alle optimalen Lösungen der Gleichung aus</td>
  </tr>
  <tr>
    <td>EquationShiftAPI.getActualEquationResult()</td>
    <td>String</td>
    <td>Gibt die vom Benutzer erreichte Lösung aus</td>
  </tr>
  <tr>
    <td>EquationShiftAPI.getExecutedEquationConversions()</td>
    <td>Object[]</td>
    <td>Gibt die vom Benutzer durchgeführten Umformungsschritte aus</td>
  </tr>
</table>

## Ausführung der Beispiele

### Webapplikation

- zum Start der beispielhaften [Webapplikation](./examples/WebApplication) muss die dazugehörige [HTML-Datei](./examples/WebApplication/index.html) in einem Browser geöffnet werden

### Jupyter Notebook

- ```pip install notebook``` ausführen
- ```pip install jp_proxy_widget``` ausführen
- ```jupyter notebook``` im [JupyterNotebook-Verzeichnis](./examples/JupyterNotebook) ausführen
- `EquationShiftNotebook` auswählen und mittels `Run` starten

## Verwendete Software

<table>
  <tr>
    <td><a href="https://github.com/bevacqua/dragula">Dragula</a></td>
    <td>von <a href="https://github.com/bevacqua">bevacqua</a></td>
    <td>lizenziert mit <a href="https://github.com/bevacqua/dragula/blob/master/license">MIT License</a>
  </tr>
  <tr>
    <td><a href="https://github.com/josdejong/mathjs">Math.js</a></td>
    <td>von <a href="https://github.com/josdejong">josdejong</a></td>
    <td>lizenziert mit <a href="https://github.com/josdejong/mathjs/blob/develop/LICENSE">Apache License 2.0</a>
  </tr>
  <tr>
    <td><a href="https://github.com/jiggzson/nerdamer">Nerdamer</a></td>
    <td>von <a href="https://github.com/jiggzson">jiggzson</a></td>
    <td>lizenziert mit <a href="https://github.com/jiggzson/nerdamer/blob/master/license.txt">MIT License</a>
  </tr>
  <tr>
    <td><a href="https://github.com/twbs/bootstrap">Bootstrap</a></td>
    <td>von <a href="https://github.com/twbs">Bootstrap</a></td>
    <td>lizenziert mit <a href="https://github.com/twbs/bootstrap/blob/main/LICENSE">MIT License</a>
  </tr>
  <tr>
    <td><a href="https://github.com/jquery/jquery">jQuery</a></td>
    <td>von <a href="https://github.com/jquery">jQuery</a></td>
    <td>lizenziert mit <a href="https://github.com/jquery/jquery/blob/main/LICENSE.txt">MIT License</a>
  </tr>
</table>
