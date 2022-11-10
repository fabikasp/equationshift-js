/*!
  * equationshift-js (https://gitlab.imn.htwk-leipzig.de/fkaspare/equationshift-js)
  * Copyright Fabian Kasparek (https://gitlab.imn.htwk-leipzig.de/fkaspare)
  * Licensed under GNU General Public License v3.0 (https://gitlab.imn.htwk-leipzig.de/fkaspare/equationshift-js/-/blob/main/LICENSE)
  */
const EquationShift = Object.freeze({ /* component for equation shift engine */
  state: {
    startLeftEquationPart: null, /* handed over left equation part */
    startRightEquationPart: null, /* handed over right equation part */
    priorLeftEquationPartUl: null, /* variable for storing the left equation part ul before dragging */
    priorRightEquationPartUl: null, /* variable for storing the right equation part ul before dragging */
    listItemCounter: 0, /* relevant for the ids of the list items */
    targetVariable: null, /* target variable of the considered equation */
    executedEquationConversions: [] /* stores the equation conversions executed by the user */
  },

  equationShiftConfig: { /* config for framework */
    supportiveMode: true,
    groupTokens: true,
    autoSimplification: true,
    lockWhenSolved: true,
    showPreview: true,
    prettifyFractions: false,
    checkIfEquationIsSolvable: true,
    simplifyEquationShiftExpression: (mathExpression) => { /* default simplify function */
      let simplifiedExpression = nerdamer("simplify(" + mathExpression + ")").toString(); /* use nerdamer to handle higher functions like sqrt and power */
  
      if (simplifiedExpression.includes("abs")) {
        simplifiedExpression = simplifiedExpression.replace("abs", ""); /* sqrt values are positive by default */
      }
    
      simplifiedExpression = math.simplify(simplifiedExpression).toString(); /* simplification of expression with mathjs to produce mathjs order of expression */
    
      simplifiedExpression = math.simplify(simplifiedExpression, [ /* simplify expression with bracket rules */
        "n1*(n2+n3) -> n1*n2+n1*n3", /* dissolve brackets */
        "n1*(n2*n3) -> n1*n2*n3"
      ]).toString();
    
      simplifiedExpression = math.simplify(simplifiedExpression).toString(); /* simplify expression because simplification with rules only considers rules */
    
      return math.simplify(simplifiedExpression, [ /* simplify expression with operator rules */
        "n1+-n2 -> n1-n2", /* prevent operator conflicts */ 
        "n1-+n2 -> n1-n2"
      ]).toString();
    },
    equationIsSolvable: (leftEquationPart, rightEquationPart, targetVariable) => { /* default function for checking if equation is solvable */
      try { /* check if given equation is solvable */
        const equationResult = nerdamer.solveEquations(leftEquationPart + "=" + rightEquationPart, targetVariable).toString();

        if (!equationResult) {
          throw new Error();
        }
      } catch (e) {
        return false;
      }

      return true;
    },
  },

  mathSymbols: { /* includes default math symbols */
    ADD: "+",
    SUB: "-",
    MUL: "*",
    DIV: "/",
    OPENING_BRACKET: "(",
    CLOSING_BRACKET: ")",
    POW: "^",
    SQRT: "sqrt"
  },

  identifiers: { /* includes all tree node names and class names of list items */
    ARGUMENT_EXPRESSIONS: "args",
    BRACKET_CONTENT: "content",
    BRACKET_ITEM: "bracketItem",
    FUNCTION: "fn",
    FUNCTION_NAME: "name",
    FUNCTION_OPENING_BRACKET: "functionOpeningBracket",
    FUNCTION_CLOSING_BRACKET: "functionClosingBracket",
    OPERATOR: "op",
    POWER_SYMBOL: "powerSymbol",
    RAW_OPENING_BRACKET: "rawOpeningBracket",
    RAW_CLOSING_BRACKET: "rawClosingBracket",
    UNARY_MINUS: "unaryMinus",
    VALUE: "value",
    VAR_NAME: "name"
  },

  containers: { /* includes left and right drag and drop container, the division zones and fraction components */
    LEFT_EQUATION_PART_UL: "left-equation-part-ul",
    RIGHT_EQUATION_PART_UL: "right-equation-part-ul",
    FIRST_DIVISION_ZONE_UL: "first-division-zone-ul",
    SECOND_DIVISION_ZONE_UL: "second-division-zone-ul",
    FRACTION: "fraction",
    NUMERATOR: "numerator",
    DENOMINATOR: "denominator"
  },

  validateStartEquation: (leftEquationPart, rightEquationPart, targetVariable) => { /* validates equation given by user and returns an error message */
    if (leftEquationPart === "") { /* if left equation part is empty */
      return "The left equation part is empty";
    }

    if (rightEquationPart === "") { /* if right equation part is empty */
      return "The right equation part is empty";
    }

    if ((/([^0-9A-Za-z+*\/\-^\s().,])/g).test(leftEquationPart)) { /* if left equation part is invalid */
      return "The left equation part includes invalid characters";
    }

    if ((/([^0-9A-Za-z+*\/\-^\s().,])/g).test(rightEquationPart)) { /* if right equation part is invalid */
      return "The right equation part includes invalid characters";
    }

    if (targetVariable === "") { /* if target variable is empty */
      return "The target variable is empty";
    }

    if (targetVariable.length !== 1) { /* if target variable is longer than one character */
      return "The target variable includes more than one character";
    }

    if (!targetVariable.match("[a-zA-Z]")) { /* if target variable is invalid */
      return "The target variable includes invalid characters";
    }

    const equationPartContainsTargetVariable = (equationPart, targetVariable) => { /* check if equation part contains target variable */
      for (let i = 0; i < equationPart.length; i++) {
        if (equationPart.charAt(i) === targetVariable) {
          if (
            (i === 0 || !equationPart.charAt(i - 1).match("[a-zA-Z]")) /* check if chars before and after letter are not letters too */
            && (i === equationPart.length - 1 || !equationPart.charAt(i + 1).match("[a-zA-Z]"))
          ) {
            return true;
          }
        }
      }

      return false;
    };

    if ( /* if target variable is in none of the equation parts throw exception */
      !equationPartContainsTargetVariable(leftEquationPart, targetVariable)
      && !equationPartContainsTargetVariable(rightEquationPart, targetVariable)
    ) {
      return "Both equation parts do not include the target variable " + targetVariable;
    }

    if (EquationShift.equationShiftConfig.checkIfEquationIsSolvable) { /* if user enabled config */
      if (!EquationShift.equationShiftConfig.equationIsSolvable()) { /* if equation is not solvable */
        return "The equation " + leftEquationPart + " = " + rightEquationPart + " is not solvable";
      }
    }

    return "";
  },

  createListItem: (ul, textContent, classNames, furtherAttributes) => { /* create li and append it to given ul */
    EquationShift.state.listItemCounter++;

    let li = document.createElement("li");
    li.setAttribute("id", EquationShift.state.listItemCounter); /* set id */
    classNames.forEach((className) => { /* set classes */
      if (className !== null) {
        li.classList.add(className);
      }
    });
    
    for (let furtherAttributeKey in furtherAttributes) { /* set further attributes */
      li.setAttribute(furtherAttributeKey, furtherAttributes[furtherAttributeKey]);
    }

    li.appendChild(document.createTextNode(textContent)); /* append li to ul */
    ul.append(li);
  },

  postProcessBuiltListItemsToGroupTokens: (ul) => { /* Make draggable lis compact to avoid false operations */
    const ulChildren = ul.children();
    let newExpressionStructure = [];
    let consideredIndex = 0;

    while (consideredIndex !== null) {
      if (
        ulChildren[consideredIndex].classList.contains(EquationShift.identifiers.OPERATOR)
        || ulChildren[consideredIndex].classList.contains(EquationShift.identifiers.POWER_SYMBOL)
      ) { /* if current li is an operator */
        newExpressionStructure.push([ulChildren[consideredIndex]]); /* add operator to array as separate element and increment index */
        consideredIndex++;
      }

      const correspondingListItems = EquationShift.identifyCorrespondingExpression(ulChildren[consideredIndex], ul, false); /* search and add corresponding expression */
      newExpressionStructure.push(correspondingListItems);
      
      if (consideredIndex + correspondingListItems.length > ulChildren.length - 1) { /* if expression processing is finished */
        consideredIndex = null;
      } else {
        consideredIndex = consideredIndex + correspondingListItems.length; /* new index is old index + length of the corresponding expression */
      }
    }

    ul.empty();
    for (expressionListItems of newExpressionStructure) { /* empty ul and create new list items */
      let classNames = [];
      if (expressionListItems.length === 1 && expressionListItems[0].classList.contains(EquationShift.identifiers.OPERATOR)) {
        classNames.push(EquationShift.identifiers.OPERATOR); /* add operator identifier to list item */
      } else if (expressionListItems.length === 1 && expressionListItems[0].classList.contains(EquationShift.identifiers.POWER_SYMBOL)) {
        classNames.push(EquationShift.identifiers.POWER_SYMBOL); /* add pow identifier to list item */
      } else if (expressionListItems[0].classList.contains(EquationShift.identifiers.FUNCTION)) {
        classNames.push(EquationShift.identifiers.FUNCTION); /* add function identifier to list item */
      }

      EquationShift.createListItem(ul, EquationShift.convertListItemsToString(expressionListItems), classNames, {});
    }
  },

  identifyNumeratorOfDivision: (divisionLi, ul) => { /* identifies the numerator of a division by back tracing */
    const ulChildren = ul.children();
    const divisionLiIndex = EquationShift.getIndexOfListItem(divisionLi, ul);
    const divisionLiIsBracketItem = divisionLi.classList.contains(EquationShift.identifiers.BRACKET_ITEM);
    const startIndex = divisionLiIsBracketItem /* start search at item after opening bracket if div li is a bracket item */
      ? EquationShift.getIndexOfListItem($("li#" + divisionLi.getAttribute("afterOpeningBracket"))[0], ul) + 1
      : 0;

    let result;
    for (let i = divisionLiIndex - 1; i >= startIndex; i--) { /* back tracing */
      /* the first element after the last non bracket operator */
      if (divisionLiIsBracketItem) {
        if (ulChildren[i].classList.contains(EquationShift.identifiers.OPERATOR)) {
          result = EquationShift.identifyCorrespondingExpression(ulChildren[i + 1], ul, false); /* identify whole expression for element */
  
          break; /* break loop because result is given */
        }
      } else {
        if (ulChildren[i].classList.contains(EquationShift.identifiers.OPERATOR) && !ulChildren[i].classList.contains(EquationShift.identifiers.BRACKET_ITEM)) {
          result = EquationShift.identifyCorrespondingExpression(ulChildren[i + 1], ul, false); /* identify whole expression for element */
  
          break; /* break loop because result is given */
        }
      }

      if (i === startIndex) { /* the start element of the ul */
        result = EquationShift.identifyCorrespondingExpression(ulChildren[i], ul, false); /* identify whole expression for element */
      }
    }

    const indexOfLastResultElement = EquationShift.getIndexOfListItem(result[result.length - 1], ul); /* index of the last result element in the ul */
    if (ulChildren[indexOfLastResultElement + 1].innerHTML === EquationShift.mathSymbols.POW) { /* if result is part of a power */
      result.push(ulChildren[indexOfLastResultElement + 1]); /* add power operator to result */
      result = result.concat(EquationShift.identifyCorrespondingExpression(ulChildren[indexOfLastResultElement + 2], ul, false)); /* add exponent to result */
      
      return result;
    }

    return result;
  },

  identifyDenominatorOfDivision: (divisionLi, ul) => { /* identifies the denominator of a division */
    const ulChildren = ul.children();
    const divisionLiIndex = EquationShift.getIndexOfListItem(divisionLi, ul);

    let result = EquationShift.identifyCorrespondingExpression(ulChildren[divisionLiIndex + 1], ul, false); /* identify whole expression for element */

    const indexOfLastResultElement = EquationShift.getIndexOfListItem(result[result.length - 1], ul); /* index of the last result element in the ul */
    /* if index is not at the end of the ul and result is part of a power */
    if (indexOfLastResultElement !== ulChildren.length - 1 && ulChildren[indexOfLastResultElement + 1].innerHTML === EquationShift.mathSymbols.POW) { 
      result.push(ulChildren[indexOfLastResultElement + 1]); /* add power operator to result */
      result = result.concat(EquationShift.identifyCorrespondingExpression(ulChildren[indexOfLastResultElement + 2], ul, false)); /* add exponent to result */
      
      return result;
    }

    return result;
  },

  postProcessBuiltListItemsToPrettifyFractions: (ul) => { /* prettify fractions */
    const ulChildren = ul.children();
    let fractions = [];

    for (let i = 0; i < ulChildren.length; i++) {
      const listItem = ulChildren[i];

      /* if considered list item is a div symbol */
      if (listItem.innerHTML === EquationShift.mathSymbols.DIV) {
        const numerator = EquationShift.identifyNumeratorOfDivision(ulChildren[i], ul);
        const denominator = EquationShift.identifyDenominatorOfDivision(ulChildren[i], ul);
        let consideredIds = [];

        for (numeratorItem of numerator) { /* collect the ids of all numerator, denominator and div symbol items */
          consideredIds.push(numeratorItem.id);
        }

        for (denominatorItem of denominator) {
          consideredIds.push(denominatorItem.id);
        }

        consideredIds.push(ulChildren[i].id);

        const newFraction = { /* build fraction object and push it to the fractions array */
          numerator: numerator,
          stroke: ulChildren[i],
          denominator: denominator,
          consideredIds: consideredIds,
          startIndex: EquationShift.getIndexOfListItem(numerator[0], ul)
        };

        fractions.push(newFraction);
      }
    }

    for (fraction of fractions) {
      for (let i = 0; i < ulChildren.length; i++) { /* mark all items to be transformed with null to detect them better */
        if (ulChildren[i] !== null && fraction.consideredIds.includes(ulChildren[i].id)) {
          ulChildren[i] = null;
        }
      }

      const numeratorSpan = document.createElement("span"); /* create span for numerator list items */
      numeratorSpan.classList.add("numerator");
      fraction.numerator.forEach((numeratorLi) => numeratorSpan.appendChild(numeratorLi));

      const denominatorSpan = document.createElement("span"); /* create span for denominator list items */
      denominatorSpan.classList.add("denominator");
      fraction.denominator.forEach((denominatorLi) => denominatorSpan.appendChild(denominatorLi));

      const fractionDiv = document.createElement("div"); /* create fraction container for numerator and denominator */
      fractionDiv.setAttribute("id", fraction.stroke.id); /* fraction has the id of its div symbol to avoid identification problems */
      fractionDiv.classList.add("fraction");
      fractionDiv.appendChild(numeratorSpan);
      fractionDiv.appendChild(denominatorSpan);

      ulChildren[fraction.startIndex] = fractionDiv; /* place fraction at old location */
    }

    ul.empty();
    for (ulChild of ulChildren) { /* print all unchanged and new items to the ul */
      if (ulChild !== null) {
        ul.append(ulChild);
      }
    }
  },

  buildListItemsByMathExpression: (mathExpression, ul) => { /* converts math expression to tree and builds list items out of it */
    const buildListItemsByMathExpressionRecursively = (tokenizedMathExpression, className, reference) => { /* goes through expression tree recursively and builds list items */
      if (EquationShift.identifiers.FUNCTION in tokenizedMathExpression) { /* if object contains function */
        if (tokenizedMathExpression.fn === EquationShift.identifiers.UNARY_MINUS) { /* if function is unary minus with only one operand */
          EquationShift.createListItem(ul, tokenizedMathExpression.op, [EquationShift.identifiers.OPERATOR, className], reference); /* build unary operator first */

          buildListItemsByMathExpressionRecursively(tokenizedMathExpression.args[0], className, reference); /* build operand of unary operator */

          return; /* do not consider further elements */
        }
        
        /* if function is a real function with arguments */
        if (typeof tokenizedMathExpression.fn === "object" && EquationShift.identifiers.FUNCTION_NAME in tokenizedMathExpression.fn) {
          EquationShift.createListItem(ul, tokenizedMathExpression.fn.name, [EquationShift.identifiers.FUNCTION, className], reference); /* build function name */
          EquationShift.createListItem(ul, EquationShift.mathSymbols.OPENING_BRACKET, [EquationShift.identifiers.FUNCTION_OPENING_BRACKET, className], reference); /* build opening bracket */
          const openingBracketId = EquationShift.state.listItemCounter; /* buffer id of opening bracket */

          buildListItemsByMathExpressionRecursively(tokenizedMathExpression.args[0], EquationShift.identifiers.BRACKET_ITEM, {"afterOpeningBracket": openingBracketId}); /* build inner expression of function */

          /* build closing bracket and reference id of opening bracket */
          EquationShift.createListItem(ul, EquationShift.mathSymbols.CLOSING_BRACKET, [EquationShift.identifiers.FUNCTION_CLOSING_BRACKET, className], {"closesOpeningBracket": openingBracketId});

          return; /* do not consider further elements */
        }
      }

      if (EquationShift.identifiers.BRACKET_CONTENT in tokenizedMathExpression) { /* if element is a bracket expression */
        EquationShift.createListItem(ul, EquationShift.mathSymbols.OPENING_BRACKET, [EquationShift.identifiers.RAW_OPENING_BRACKET, className], reference); /* build opening bracket */
        const openingBracketId = EquationShift.state.listItemCounter; /* buffer id of opening bracket */

        buildListItemsByMathExpressionRecursively(tokenizedMathExpression.content, EquationShift.identifiers.BRACKET_ITEM, {"afterOpeningBracket": openingBracketId}); /* build inner expression of bracket */

        /* build closing bracket and reference id of opening bracket */
        EquationShift.createListItem(ul, EquationShift.mathSymbols.CLOSING_BRACKET, [EquationShift.identifiers.RAW_CLOSING_BRACKET, className], {"closesOpeningBracket": openingBracketId});

        return; /* do not consider further elements */
      }

      if (EquationShift.identifiers.ARGUMENT_EXPRESSIONS in tokenizedMathExpression) { /* if element contains arguments of an operator */
        buildListItemsByMathExpressionRecursively(tokenizedMathExpression.args[0], className, reference); /* build first argument */
  
        EquationShift.createListItem( /* build operator */
          ul, tokenizedMathExpression.op, 
          [(tokenizedMathExpression.op === "^" ? EquationShift.identifiers.POWER_SYMBOL : EquationShift.identifiers.OPERATOR), className], /* note if operator is a power symbol */
          reference
        );

        buildListItemsByMathExpressionRecursively(tokenizedMathExpression.args[1], className, reference); /* build second argument */
      }

      if (EquationShift.identifiers.VALUE in tokenizedMathExpression) { /* if element is a value */
        EquationShift.createListItem(ul, tokenizedMathExpression.value, [EquationShift.identifiers.VALUE, className], reference); /* build value */
      }

      if (EquationShift.identifiers.VAR_NAME in tokenizedMathExpression) { /* if element is a variable */
        EquationShift.createListItem(ul, tokenizedMathExpression.name, [EquationShift.identifiers.VAR_NAME, className], reference); /* build variable */
      }
    };

    try {
      const tokenizedMathExpression = math.parse(mathExpression); /* use parse function of mathjs to build object tree of math expression */

      buildListItemsByMathExpressionRecursively(tokenizedMathExpression, null, {});

      if (EquationShift.equationShiftConfig.groupTokens) { /* post process list items */
        EquationShift.postProcessBuiltListItemsToGroupTokens(ul);
      }

      if (EquationShift.equationShiftConfig.prettifyFractions) { /* prettify fractions */
        EquationShift.postProcessBuiltListItemsToPrettifyFractions(ul);
      }

      if (!(EquationShift.equationShiftConfig.lockWhenSolved && EquationShift.equationIsSolved())) { /* avoid function executions when equation is locked */
        EquationShift.declareEventListenersForFunctionItems(); /* event listeners are refreshed after DOM change */
      } else {
        const functionItems = $("." + EquationShift.identifiers.FUNCTION + ", ." + EquationShift.identifiers.POWER_SYMBOL);
  
        functionItems.off("mouseup"); /* deactivate all listeners */
        functionItems.off("mouseover");
        functionItems.off("mouseleave");
      }
    } catch (e) {
      return; /* ignore exceptions */
    }
  },

  bringUlChildrenIntoProcessableFormat: (ulChildren) => { /* converts prettified fractions to normal format for better processing */
    if (!EquationShift.equationShiftConfig.prettifyFractions) { /* if there are not any prettified fractions then return the given ul children */
      return ulChildren;
    }

    let newUlChildren = [];
    for (ulChild of ulChildren) {
      if (!ulChild.classList.contains(EquationShift.containers.FRACTION)) { /* normal lis are unprocessed */
        newUlChildren.push(ulChild);

        continue;
      }

      const fractionComponents = ulChild.childNodes;
      for (numeratorItem of fractionComponents[0].childNodes) { /* push all numerator lis to new ul children */
        newUlChildren.push(numeratorItem);
      }

      let divListItem = document.createElement("li"); /* create div li and append it to new ul children */
      divListItem.setAttribute("id", ulChild.id); /* set id of ulChild */
      divListItem.classList.add(EquationShift.identifiers.OPERATOR); /* set identifier to operator */
      divListItem.appendChild(document.createTextNode(EquationShift.mathSymbols.DIV)); /* append / symbol */
      newUlChildren.push(divListItem);

      for (denominatorItem of fractionComponents[1].childNodes) { /* push all denominator lis to new ul children */
        newUlChildren.push(denominatorItem);
      }
    }

    return newUlChildren;
  },

  getIndexOfListItem: (li, ul) => { /* returns index of a list item inside an ul */
    const ulChildren = EquationShift.bringUlChildrenIntoProcessableFormat(ul.children());
    let result = null;

    let index = 0;
    for (ulChild of ulChildren) {
      if (ulChild.id === li.id) {
        result = index;
      }

      index++;
    }
  
    return result;
  },

  reverseOperator: (operator) => { /* returns opposite of argument operator */
    switch (operator) {
      case EquationShift.mathSymbols.ADD: return EquationShift.mathSymbols.SUB;
      case EquationShift.mathSymbols.SUB: return EquationShift.mathSymbols.ADD;
      case EquationShift.mathSymbols.MUL: return EquationShift.mathSymbols.DIV;
      case EquationShift.mathSymbols.DIV: return EquationShift.mathSymbols.MUL;
    }
  },

  identifyCorrespondingExpression: (li, priorSourceUl, useRecursion) => { /* Identifies sub math expression recursively or not */
    const sourceUlChildren = EquationShift.bringUlChildrenIntoProcessableFormat(priorSourceUl.children());
    let liIndex = EquationShift.getIndexOfListItem(li, priorSourceUl);

    if (EquationShift.equationShiftConfig.groupTokens) { /* grouped tokens does not have any identifiers except operators */
      let listItemsAlreadyGrouped = true;
      for (listItem of sourceUlChildren) {
        if (
          listItem.classList.contains(EquationShift.identifiers.VALUE)
          || listItem.classList.contains(EquationShift.identifiers.VAR_NAME)
        ) {
          listItemsAlreadyGrouped = false;

          break;
        }
      }

      if (listItemsAlreadyGrouped) { /* check because the first grouping call should not go into this branch */
        let result = [li];

        /* if expression is concatenated with other expressions the whole expression is determined recursively */
        if (
          useRecursion 
          && liIndex !== sourceUlChildren.length - 1 
          && [EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.POW, EquationShift.mathSymbols.DIV].includes(sourceUlChildren[liIndex + 1].innerHTML)
        ) {
          result.push(sourceUlChildren[liIndex + 1]);
          result = result.concat(EquationShift.identifyCorrespondingExpression(sourceUlChildren[liIndex + 2], priorSourceUl, true));
        }

        return result;
      }
    }

    if ([EquationShift.identifiers.VALUE, EquationShift.identifiers.VAR_NAME].includes(li.classList[0])) { /* literal or variable */
      let result = [li];

      /* if expression is concatenated with other expressions the whole expression is determined recursively */
      if (
        useRecursion 
        && liIndex !== sourceUlChildren.length - 1 
        && [EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.POW, EquationShift.mathSymbols.DIV].includes(sourceUlChildren[liIndex + 1].innerHTML)
      ) {
        result.push(sourceUlChildren[liIndex + 1]);
        result = result.concat(EquationShift.identifyCorrespondingExpression(sourceUlChildren[liIndex + 2], priorSourceUl, true));
      }

      return result;
    }

    if (li.classList[0] === EquationShift.identifiers.RAW_OPENING_BRACKET) { /* bracket expression */
      const closingBracketLi = $("li[closesOpeningBracket=" + li.id + "]")[0];
      const closingBracketLiIndex = EquationShift.getIndexOfListItem(closingBracketLi, priorSourceUl);
      
      let result = [];
      for (let i = liIndex; i <= closingBracketLiIndex; i++) {
        result.push(sourceUlChildren[i]); /* concatenate all elements between the brackets */
      }

      /* if expression is concatenated with other expressions the whole expression is determined recursively */
      if (
        useRecursion 
        && closingBracketLiIndex !== sourceUlChildren.length - 1 
        && [EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.POW, EquationShift.mathSymbols.DIV].includes(sourceUlChildren[closingBracketLiIndex + 1].innerHTML)
      ) {
        result.push(sourceUlChildren[closingBracketLiIndex + 1]);
        result = result.concat(EquationShift.identifyCorrespondingExpression(sourceUlChildren[closingBracketLiIndex + 2], priorSourceUl, true));
      }

      return result;
    }

    if (li.classList[0] === EquationShift.identifiers.FUNCTION) { /* function */
      const openingBracketLi = sourceUlChildren[liIndex + 1];
      const closingBracketLi = $("li[closesOpeningBracket=" + openingBracketLi.id + "]")[0];
      const closingBracketLiIndex = EquationShift.getIndexOfListItem(closingBracketLi, priorSourceUl);
        
      let result = [];
      for (let i = liIndex; i <= closingBracketLiIndex; i++) {
        result.push(sourceUlChildren[i]); /* concatenate all elements between the brackets of the function */
      }

      /* if expression is concatenated with other expressions the whole expression is determined recursively */
      if (
        useRecursion 
        && closingBracketLiIndex !== sourceUlChildren.length - 1 
        && [EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.POW, EquationShift.mathSymbols.DIV].includes(sourceUlChildren[closingBracketLiIndex + 1].innerHTML)
      ) {
        result.push(sourceUlChildren[closingBracketLiIndex + 1]);
        result = result.concat(EquationShift.identifyCorrespondingExpression(sourceUlChildren[closingBracketLiIndex + 2], priorSourceUl, true));
      }

      return result;
    }
  },

  convertListItemsToString: (listItems) => { /* stringifies the argument list items */
    let result = "";
  
    for (li of listItems) {
      result += li.innerHTML;
    }
  
    return result.replace(/\s/g, "");
  },

  identifyOperatorOfListItem: (liIndex, ul) => { /* takes a list item and returns the corresponding operator (list item must be the first one of a chained expression) */
    const ulChildren = EquationShift.bringUlChildrenIntoProcessableFormat(ul.children());

    if ( /* if li is at the begin of the ul, null or at the begin of a bracket */
      liIndex === 0 
      || liIndex === null
      || ulChildren[liIndex - 1].innerHTML === EquationShift.mathSymbols.OPENING_BRACKET
    ) {
      return null;
    }

    return ulChildren[liIndex - 1];
  },

  /* division is a chaining operation when the corresponding list items are dragged and dropped in the same container */
  getActualListItemByBackTracing: (li, ul, divisionIsChaining) => { /* identify actually dragged list item index by searching for the beginning of the chained expression */
    const liIndex = EquationShift.getIndexOfListItem(li, ul);
    if (liIndex === 0 || liIndex === null) {
      return li; /* return given li when no chained expression is existent */
    }

    const ulChildren = EquationShift.bringUlChildrenIntoProcessableFormat(ul.children());
    const chainOperators = [EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.POW];
    if (divisionIsChaining) {
      chainOperators.push(EquationShift.mathSymbols.DIV); /* the division symbol is only a chain operator when it is set */
    }

    if (chainOperators.includes(ulChildren[liIndex - 1].innerHTML)) { /* if list item is part of a chained expression */
      for (let i = liIndex; i >= 0; i--) {
        if (li.classList.contains(EquationShift.identifiers.BRACKET_ITEM)) {
          const comparisonArray = [EquationShift.mathSymbols.ADD, EquationShift.mathSymbols.SUB, EquationShift.mathSymbols.OPENING_BRACKET];
          if (!divisionIsChaining) {
            comparisonArray.push(EquationShift.mathSymbols.DIV); /* only stop at division symbol when division is no chaining operation */
          }

          /* if item is last dash or div operator or opening bracket before the chain expression in a bracket */
          if (comparisonArray.includes(ulChildren[i].innerHTML)) {
            if (ulChildren[i + 1].classList.contains(EquationShift.identifiers.OPERATOR)) { /* if list item is an opening bracket and next list item is an operator */
              return ulChildren[i + 2];
            }

            return ulChildren[i + 1];
          }
        } else {
          const comparisonArray = [EquationShift.mathSymbols.ADD, EquationShift.mathSymbols.SUB];
          if (!divisionIsChaining) {
            comparisonArray.push(EquationShift.mathSymbols.DIV); /* only stop at division symbol when division is no chaining operation */
          }

          if ( /* if item is last dash or div operator before the chain expression */
            comparisonArray.includes(ulChildren[i].innerHTML)
            && !ulChildren[i].classList.contains(EquationShift.identifiers.BRACKET_ITEM)
          ) {
            return ulChildren[i + 1];
          }
        }

        if (i === 0) { /* if the chained expression begins at the begin of the whole expression */
          return ulChildren[i];
        }
      }
    }

    return li; /* no chained expression found */
  },

  getNextExpressionsForBilateralDragging: (li, priorSourceUl, priorTargetUl, useDivision, includeLogging) => { /* Identifies sub math expression and builds next expression when dragging between containers */
    let priorSourceUlChildren = EquationShift.bringUlChildrenIntoProcessableFormat(priorSourceUl.children());
    let priorTargetEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat(priorTargetUl.children())
    ); /* convert target ul before dropping to string */
    let priorSourceEquationPart = EquationShift.convertListItemsToString(priorSourceUlChildren); /* convert source ul before dragging to string */
    const priorTargetEquationPartCopy = priorTargetEquationPart; /* copies for logging */
    const priorSourceEquationPartCopy = priorSourceEquationPart;

    const actualLi = EquationShift.getActualListItemByBackTracing(li, priorSourceUl, false); /* search the beginning of the chained expression if there is one */
    const actualLiIndex = EquationShift.getIndexOfListItem(actualLi, priorSourceUl);
    const currentOperatorListItem = EquationShift.identifyOperatorOfListItem(actualLiIndex, priorSourceUl); /* operator list item of the considered expression */
    const currentOperator = currentOperatorListItem === null ? EquationShift.mathSymbols.ADD : currentOperatorListItem.innerHTML; /* if operator li is null the default is add */
    const targetOperator = actualLi.innerHTML === EquationShift.mathSymbols.SUB
      ? EquationShift.mathSymbols.MUL /* if the user selects a minus the target operator is set to mul */
      : useDivision /* if the user wants to divide */
        ? EquationShift.mathSymbols.DIV 
        : EquationShift.reverseOperator(currentOperator); /* the operator of the next applicable expression is the inversion of the current operator */
  
    let conversionStep;
    let lastLiOfConversionStep = null;
    if (li.innerHTML === EquationShift.mathSymbols.SUB) { /* if sub operator is dragged both sides are multiplicated with (-1) */
      conversionStep = EquationShift.mathSymbols.MUL + EquationShift.mathSymbols.OPENING_BRACKET + EquationShift.mathSymbols.SUB + "1" + EquationShift.mathSymbols.CLOSING_BRACKET;
    } else if (useDivision) { /* if user uses the division zone */
      const correspondingExpressionLis = EquationShift.identifyCorrespondingExpression(li, priorSourceUl, false); /* use li instead of actualLi to avoid chaining */
      lastLiOfConversionStep = correspondingExpressionLis[correspondingExpressionLis.length - 1];
      conversionStep = targetOperator + EquationShift.convertListItemsToString(correspondingExpressionLis);
    } else {   
      const correspondingExpressionLis = EquationShift.identifyCorrespondingExpression(actualLi, priorSourceUl, currentOperator !== EquationShift.mathSymbols.DIV) /* denominators are not concatenated */
      lastLiOfConversionStep = correspondingExpressionLis[correspondingExpressionLis.length - 1];
      conversionStep = targetOperator + EquationShift.convertListItemsToString(correspondingExpressionLis); /* expression which has to be connected with old equation part */
    }

    let targetEquationPart;
    let sourceEquationPart;
    if (EquationShift.equationShiftConfig.supportiveMode || lastLiOfConversionStep === null || useDivision) { /* if supportive mode is enabled or conversion step is inversion or division */
      if (
        EquationShift.equationShiftConfig.autoSimplification /* always use brackets */
        || ![EquationShift.mathSymbols.ADD, EquationShift.mathSymbols.SUB].includes(targetOperator) /* do not use brackets when forming step is not complex */
      ) {
        priorTargetEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorTargetEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET; /* prepare for simplifying */
        priorSourceEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorSourceEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET;
      }

      targetEquationPart = priorTargetEquationPart + conversionStep;
      sourceEquationPart = priorSourceEquationPart + conversionStep;
    } else {
      const targetUl = $("#" + priorTargetUl.attr("id")).clone(); /* clone target ul to find drop index */
      const targetUlChildren = targetUl.children();
      const dropIndex = EquationShift.getIndexOfListItem(li, targetUl); /* index where the li is dropped */
      if (dropIndex === targetUlChildren.length - 1 || dropIndex === 0) { /* li is placed at the end of the equation if drop index is at the end or the beginning */
        /* do not use brackets when manual simplification is enabled and target operator is add or sub */
        if (!(!EquationShift.equationShiftConfig.autoSimplification && [EquationShift.mathSymbols.ADD, EquationShift.mathSymbols.SUB].includes(targetOperator))) {
          priorTargetEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorTargetEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET; /* prepare for simplifying */
        }

        targetEquationPart = priorTargetEquationPart + conversionStep;
      } else {
        targetUlChildren[dropIndex].replaceChildren(); /* replace li content at drop index with conversion step */
        targetUlChildren[dropIndex].appendChild(document.createTextNode(conversionStep));
        targetEquationPart = EquationShift.convertListItemsToString(targetUlChildren);
      }

      sourceEquationPart = ""; /* remove conversion step manually from source equation part */
      for (
        let i = 0; 
        i < ((actualLiIndex === 0 || priorSourceUlChildren[actualLiIndex - 1].innerHTML === EquationShift.mathSymbols.OPENING_BRACKET) ? actualLiIndex : actualLiIndex - 1); 
        i++ /* consider first elements of equation part or of bracket separately */
      ) {
        if ( /* ignore first add operator in brackets */
          sourceEquationPart.charAt(sourceEquationPart.length - 1) === EquationShift.mathSymbols.OPENING_BRACKET 
          && priorSourceUlChildren[i].innerHTML === EquationShift.mathSymbols.ADD
        ) {
          continue;
        }

        sourceEquationPart += priorSourceUlChildren[i].innerHTML;
      }
      
      const lastLiIndexOfConversionStep = EquationShift.getIndexOfListItem(lastLiOfConversionStep, priorSourceUl);
      if (lastLiIndexOfConversionStep !== priorSourceUlChildren.length - 1) {
        for (let i = lastLiIndexOfConversionStep + 1; i < priorSourceUlChildren.length; i++) {
          if ( /* ignore first add operator in brackets */
            sourceEquationPart.charAt(sourceEquationPart.length - 1) === EquationShift.mathSymbols.OPENING_BRACKET 
            && priorSourceUlChildren[i].innerHTML === EquationShift.mathSymbols.ADD
          ) {
            continue;
          }

          sourceEquationPart += priorSourceUlChildren[i].innerHTML;
        }
      }

      if (sourceEquationPart.charAt(0) === EquationShift.mathSymbols.ADD) { /* remove add operator as first symbol */
        sourceEquationPart = sourceEquationPart.substring(1);
      }

      if (sourceEquationPart.length === 0) { /* equation part must not be empty */
        sourceEquationPart = "0";
      }
    }

    targetEquationPart = EquationShift.equationShiftConfig.autoSimplification /* do not simplify when autoSimplification is deactivated */
      ? EquationShift.equationShiftConfig.simplifyEquationShiftExpression(targetEquationPart) 
      : EquationShift.removeChainedOperators(targetEquationPart); /* just remove chained operators */

    sourceEquationPart = EquationShift.equationShiftConfig.autoSimplification /* do not simplify when autoSimplification is deactivated */
      ? EquationShift.equationShiftConfig.simplifyEquationShiftExpression(sourceEquationPart) 
      : EquationShift.removeChainedOperators(sourceEquationPart); /* just remove chained operators */

    if (includeLogging) { /* add entry to executed equation conversions */
      const targetIsLeftContainer = priorTargetUl.attr("id") === EquationShift.containers.LEFT_EQUATION_PART_UL; /* is the left container the drop target? */
      EquationShift.addEntryToExecutedEquationConversions(
        targetIsLeftContainer ? priorTargetEquationPartCopy : priorSourceEquationPartCopy,
        targetIsLeftContainer ? targetEquationPart : sourceEquationPart,
        !targetIsLeftContainer ? priorTargetEquationPartCopy : priorSourceEquationPartCopy,
        !targetIsLeftContainer ? targetEquationPart : sourceEquationPart,
        conversionStep
      );
    }

    return { /* return the new equation parts */
      targetEquationPart: targetEquationPart,
      sourceEquationPart: sourceEquationPart
    };
  },

  getNextExpressionForUnilateralDragging: (li, targetUl, priorTargetUl, includeLogging) => { /* builds next expression for single container when dragging in the same container */
    const priorTargetUlChildren = EquationShift.bringUlChildrenIntoProcessableFormat(priorTargetUl.children()); /* children of target ul before and after dragging */
    const priorTargetEquationPart = EquationShift.convertListItemsToString(priorTargetUlChildren); /* stringify prior target ul children */
    const targetUlChildren = EquationShift.bringUlChildrenIntoProcessableFormat(targetUl.clone().children());
    const liIndexInTargetUl = EquationShift.getIndexOfListItem(li, targetUl); /* current li index to identify neighbors */
    const actualLi = EquationShift.getActualListItemByBackTracing(li, priorTargetUl, true);
    const actualLiIndexInPriorTargetUl = EquationShift.getIndexOfListItem(actualLi, priorTargetUl); /* index of considered list item in target ul before and after dragging */
    let rightNeighborLi = (liIndexInTargetUl !== targetUlChildren.length - 1) ? targetUlChildren[liIndexInTargetUl + 1] : null; /* right neighbor li in target ul */
    let leftNeighborLi = liIndexInTargetUl !== 0 ? targetUlChildren[liIndexInTargetUl - 1] : null; /* left neighbor li in target ul */
    let neighborListItem = null;

    if ( /* check if right neighbor is the processable list item */
      rightNeighborLi !== null 
      && rightNeighborLi !== undefined
      && !rightNeighborLi.classList.contains(EquationShift.identifiers.OPERATOR)
      && !rightNeighborLi.classList.contains(EquationShift.identifiers.POWER_SYMBOL)
    ) {
      if (rightNeighborLi.classList.contains(EquationShift.identifiers.RAW_CLOSING_BRACKET)) { /* if neighbor is closing bracket the opening bracket is determined */
        rightNeighborLi = $("#" + rightNeighborLi.getAttribute("closesOpeningBracket"))[0];
      } else if (rightNeighborLi.classList.contains(EquationShift.identifiers.FUNCTION_CLOSING_BRACKET)) { /* if neighbor is function closing bracket the function is determined */
        const openingBracketIndex = EquationShift.getIndexOfListItem($("#" + rightNeighborLi.getAttribute("closesOpeningBracket"))[0], priorTargetUl); /* index of function opening bracket */
        
        rightNeighborLi = priorTargetUlChildren[openingBracketIndex - 1]; /* set the function name as neighbor */
      }

      neighborListItem = EquationShift.getActualListItemByBackTracing(rightNeighborLi, priorTargetUl, true); /* identify the first list item if neighbor list item is part of a chained expression */
    }

    if ( /* check if left neighbor is the processable list item */
      leftNeighborLi !== null 
      && leftNeighborLi !== undefined 
      && !leftNeighborLi.classList.contains(EquationShift.identifiers.OPERATOR)
      && !leftNeighborLi.classList.contains(EquationShift.identifiers.POWER_SYMBOL)
    ) {
      if (leftNeighborLi.classList.contains(EquationShift.identifiers.RAW_CLOSING_BRACKET)) { /* if neighbor is closing bracket the opening bracket is determined */
        leftNeighborLi = $("#" + leftNeighborLi.getAttribute("closesOpeningBracket"))[0];
      } else if (leftNeighborLi.classList.contains(EquationShift.identifiers.FUNCTION_CLOSING_BRACKET)) { /* if neighbor is function closing bracket the function is determined */
        const openingBracketIndex = EquationShift.getIndexOfListItem($("#" + leftNeighborLi.getAttribute("closesOpeningBracket"))[0], priorTargetUl); /* index of function opening bracket */
        
        leftNeighborLi = priorTargetUlChildren[openingBracketIndex - 1]; /* set the function name as neighbor */
      }

      neighborListItem = EquationShift.getActualListItemByBackTracing(leftNeighborLi, priorTargetUl, true); /* identify the first list item if neighbor list item is part of a chained expression */
    }

    if (!neighborListItem) { /* if neighbor list item is still null return old equation part */
      return priorTargetEquationPart;
    }

    const consideredListItems = EquationShift.identifyCorrespondingExpression(actualLi, priorTargetUl, true);
    const consideredListItemsOperator = EquationShift.identifyOperatorOfListItem(actualLiIndexInPriorTargetUl, priorTargetUl);
    const neighborListItemIndex = EquationShift.getIndexOfListItem(neighborListItem, priorTargetUl);
    const neighborListItems = EquationShift.identifyCorrespondingExpression(neighborListItem, priorTargetUl, true);
    const neighborListItemsOperator = EquationShift.identifyOperatorOfListItem(neighborListItemIndex, priorTargetUl);

    /* delete all considered and neighbor list items including their operators out of old equation part and stringify it */
    let updatedTargetUlChildren = priorTargetUlChildren.filter((index, priorTargetUlChild) => {
      if (EquationShift.equationShiftConfig.prettifyFractions) { /* filter arguments have a different order in activated prettifyFractions config */
        const swapItem = priorTargetUlChild;
        priorTargetUlChild = index;
        index = swapItem;
      }

      for (consideredListItem of consideredListItems) {
        if (consideredListItem.id === priorTargetUlChild.id) {
          return false;
        }
      }

      for (neighborListItem of neighborListItems) {
        if (neighborListItem.id === priorTargetUlChild.id) {
          return false;
        }
      }

      if (
        consideredListItemsOperator !== null && consideredListItemsOperator.id === priorTargetUlChild.id
        || neighborListItemsOperator !== null && neighborListItemsOperator.id === priorTargetUlChild.id
      ) {
        return false;
      }

      return true;
    });
    let updatedTargetUlChildrenString = EquationShift.convertListItemsToString(updatedTargetUlChildren);

    if (updatedTargetUlChildrenString.charAt(0) === EquationShift.mathSymbols.ADD) { /* first add operator is deleted to avoid simplification errors */
      updatedTargetUlChildrenString = updatedTargetUlChildrenString.substring(1);
    }

    let partlySimplifiedExpression;
    if (EquationShift.listItemArraysAreEqual(consideredListItems, neighborListItems)) { /* if user wants to simplify one instead of two expressions */
      partlySimplifiedExpression = EquationShift.equationShiftConfig.simplifyEquationShiftExpression(EquationShift.convertListItemsToString(consideredListItems));
    } else {
      /* simplify two expressions */
      partlySimplifiedExpression = EquationShift.equationShiftConfig.simplifyEquationShiftExpression(
        EquationShift.mathSymbols.OPENING_BRACKET /* put the first expression into brackets */
          /* first operator can be missed out if it is not existent or an add operator */
          + (neighborListItemsOperator !== null && neighborListItemsOperator.innerHTML !== EquationShift.mathSymbols.ADD ? neighborListItemsOperator.innerHTML : "")
          + EquationShift.convertListItemsToString(neighborListItems)
          + EquationShift.mathSymbols.CLOSING_BRACKET
          /* second operator connects the two expressions with each other and is an add operator by default */
          + (consideredListItemsOperator !== null ? consideredListItemsOperator.innerHTML : EquationShift.mathSymbols.ADD) 
          + EquationShift.mathSymbols.OPENING_BRACKET /* put the second expression into brackets */
          + EquationShift.convertListItemsToString(consideredListItems)
          + EquationShift.mathSymbols.CLOSING_BRACKET
      );
    }

    let targetEquationPart;
    if (actualLi.classList.contains(EquationShift.identifiers.BRACKET_ITEM) && neighborListItem.classList.contains(EquationShift.identifiers.BRACKET_ITEM)) { /* handle bracket items separately */
      const openingBracket = $("#" + actualLi.getAttribute("afterOpeningBracket"))[0]; /* opening bracket of considered bracket */
      const closingBracket = $("[closesOpeningBracket=" + actualLi.getAttribute("afterOpeningBracket") + "]")[0]; /* closing bracket of considered bracket */
      let bracketIsEmpty = false; /* check if bracket is empty to evaluate if add operator is necessary or not */
      for (let i = 0; i < updatedTargetUlChildren.length; i++) {
        if (updatedTargetUlChildren[i].id === openingBracket.id && updatedTargetUlChildren[i + 1].id === closingBracket.id) {
          bracketIsEmpty = true;

          break;
        }
      }

      let newListItem = document.createElement("li"); /* create new li for attached bracket expression */
      newListItem.appendChild(document.createTextNode((bracketIsEmpty ? "" : EquationShift.mathSymbols.ADD) + partlySimplifiedExpression + EquationShift.mathSymbols.CLOSING_BRACKET));
      
      for (let i = 0; i < updatedTargetUlChildren.length; i++) { 
        if (updatedTargetUlChildren[i].id === openingBracket.id && updatedTargetUlChildren[i + 1].innerHTML === EquationShift.mathSymbols.ADD) { /* remove add operator as first item of a bracket */
          updatedTargetUlChildren[i + 1].replaceChildren();
        }

        if (updatedTargetUlChildren[i].id === closingBracket.id) { /* replace closing bracket with new item */
          updatedTargetUlChildren[i] = newListItem;
        }
      }

      /* connect old bracket items with new party simplified expression and remove chained operators */
      targetEquationPart = EquationShift.removeChainedOperators(EquationShift.convertListItemsToString(updatedTargetUlChildren));
    } else {
      targetEquationPart = EquationShift.removeChainedOperators( /* connect old target ul children with new party simplified expression and remove chained operators */
        updatedTargetUlChildrenString + (updatedTargetUlChildrenString.length !== 0 ? EquationShift.mathSymbols.ADD : "") + partlySimplifiedExpression
      );
    }

    if (includeLogging) { /* add entry to executed equation conversions */
      const targetIsLeftContainer = priorTargetUl.attr("id") === EquationShift.containers.LEFT_EQUATION_PART_UL; /* is the left container the drop target? */
      EquationShift.addEntryToExecutedEquationConversions(
        targetIsLeftContainer ? priorTargetEquationPart : null,
        targetIsLeftContainer ? targetEquationPart : null,
        !targetIsLeftContainer ? priorTargetEquationPart : null,
        !targetIsLeftContainer ? targetEquationPart : null,
        "simplify"
      );
    }
    
    return targetEquationPart;
  },

  /* take exponent as string and produce an inverted exponent string (e.g. ["(", "1", "/", "3", ")"] => 3) */
  invertExponent: (exponent) => {
    const exponentArray = exponent.split("");
    const exponentIsFraction = exponentArray[0] === EquationShift.mathSymbols.OPENING_BRACKET; /* fraction exponents must have a bracket */

    if (exponentIsFraction) {
      return EquationShift.mathSymbols.OPENING_BRACKET
        + exponent.substring(exponent.indexOf("/") + 1, exponent.length - 1)
        + EquationShift.mathSymbols.DIV 
        + exponent.substring(1, exponent.indexOf("/"))
        + EquationShift.mathSymbols.CLOSING_BRACKET; /* invert fraction numerator and denominator */
    }

    return "(1/" + exponent + ")"; /* convert single value to fraction with value as denominator */
  },

  handleFunctionEvent: (event, includeLogging) => { /* handles a click or preview event for a function item and create equation conversion entries or not  */
    const priorLeftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL).clone(); /* left equation part ul - no use of global state to avoid corrupt variables */
    const priorRightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL).clone(); /* right equation part ul - no use of global state to avoid corrupt variables */
    let priorLeftEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat(priorLeftEquationPartUl.children())
    ); /* convert left equation part ul to string */
    let priorRightEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat(priorRightEquationPartUl.children())
    ); /* convert right equation part ul to string */

    const functionListItem = event.target;
    let leftEquationPart = priorLeftEquationPart; /* return prior equation parts if no of the listet functions is selected */
    let rightEquationPart = priorRightEquationPart;
    let conversionStep = null; /* executed conversion step */
    if (functionListItem.innerHTML.includes(EquationShift.mathSymbols.SQRT)) { /* invert sqrt to power */
      conversionStep = EquationShift.mathSymbols.POW + "2";
      leftEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorLeftEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
      rightEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorRightEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
    } else if (functionListItem.classList.contains(EquationShift.identifiers.POWER_SYMBOL)) {
      const parentUl = $("#" + functionListItem.parentNode.id); /* ul in which the li is located */
      const functionListItemIndex = EquationShift.getIndexOfListItem(functionListItem, parentUl); /* index of the li in the ul */
      const nextListItem = EquationShift.bringUlChildrenIntoProcessableFormat(parentUl.children())[functionListItemIndex + 1]; /* start of the exponent */
      const exponent = EquationShift.equationShiftConfig.groupTokens
        ? EquationShift.convertListItemsToString([nextListItem]) /* grouped token is the whole exponent */
        : EquationShift.convertListItemsToString(EquationShift.identifyCorrespondingExpression(nextListItem, parentUl, false)); /* whole exponent expression */

      if (exponent === "2") { /* use sqrt on both sides if ^2 is provided */
        conversionStep = EquationShift.mathSymbols.SQRT;
        leftEquationPart = conversionStep + EquationShift.mathSymbols.OPENING_BRACKET + priorLeftEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET;
        rightEquationPart = conversionStep + EquationShift.mathSymbols.OPENING_BRACKET + priorRightEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET;
      } else {
        const invertedExponent = EquationShift.invertExponent(exponent); /* (1/3) is inverted to 3 */
        conversionStep = EquationShift.mathSymbols.POW + invertedExponent;
        leftEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorLeftEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
        rightEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + priorRightEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
      }
    }

    leftEquationPart = EquationShift.equationShiftConfig.autoSimplification 
      ? EquationShift.equationShiftConfig.simplifyEquationShiftExpression(leftEquationPart) /* only simplify in autoSimplification mode */
      : EquationShift.removeChainedOperators(leftEquationPart); /* else just remove chained operators */
    rightEquationPart = EquationShift.equationShiftConfig.autoSimplification 
      ? EquationShift.equationShiftConfig.simplifyEquationShiftExpression(rightEquationPart) 
      : EquationShift.removeChainedOperators(rightEquationPart);

    if (includeLogging && conversionStep !== null) { /* add entry to executed equation conversions if a restructuring took place */
      EquationShift.addEntryToExecutedEquationConversions(priorLeftEquationPart, leftEquationPart, priorRightEquationPart, rightEquationPart, conversionStep);
    }

    return { /* only simplify when autoSimplification is activated */
      leftEquationPart: leftEquationPart,
      rightEquationPart: rightEquationPart
    };
  },

  declareEventListenersForFunctionItems: () => { /* removes and (re)declares the click and hover event listeners for function items */
    const functionItems = $("." + EquationShift.identifiers.FUNCTION + ", ." + EquationShift.identifiers.POWER_SYMBOL);
  
    functionItems.off("mouseup"); /* deactivate all listeners to avoid multiple declarations of the same listener */
    functionItems.off("mouseover");
    functionItems.off("mouseleave");

    const leftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
    const rightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);

    functionItems.on("mouseup", function (event) { /* on mouseup at a function */
      const functionEventData = EquationShift.handleFunctionEvent(event, true); /* with logging */

      leftEquationPartUl.empty(); /* replace left equation part ul */
      EquationShift.buildListItemsByMathExpression(functionEventData.leftEquationPart, leftEquationPartUl);

      rightEquationPartUl.empty(); /* replace left equation part ul */
      EquationShift.buildListItemsByMathExpression(functionEventData.rightEquationPart, rightEquationPartUl);

      leftEquationPartUl.removeAttr("data-tooltip"); /* remove preview tooltips */
      rightEquationPartUl.removeAttr("data-tooltip");
    });

    if (EquationShift.equationShiftConfig.showPreview) {
      functionItems.on("mouseover", function (event) {
        const functionEventData = EquationShift.handleFunctionEvent(event, false); /* without logging */

        /* show preview for both equation parts in tooltips */
        leftEquationPartUl.attr("data-tooltip", functionEventData.leftEquationPart);
        rightEquationPartUl.attr("data-tooltip", functionEventData.rightEquationPart);
      });

      functionItems.on("mouseleave", function (event) {
        leftEquationPartUl.removeAttr("data-tooltip"); /* remove preview tooltips */
        rightEquationPartUl.removeAttr("data-tooltip");
      });
    }
  },

  equationIsSolved: () => { /* check if the equation is solved */
    const leftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
    const rightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);
    const leftEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat(leftEquationPartUl.children())
    );
    const rightEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat(rightEquationPartUl.children())
    );
    const finalStates = [ /* states in which the equation is finished */
      EquationShift.state.targetVariable, /* "x" */
      EquationShift.state.targetVariable + EquationShift.mathSymbols.POW + "2" + EquationShift.mathSymbols.ADD + EquationShift.state.targetVariable, /* "x^2+x" */
      EquationShift.state.targetVariable + EquationShift.mathSymbols.POW + "2" + EquationShift.mathSymbols.SUB + EquationShift.state.targetVariable, /* "x^2-x" */
      EquationShift.state.targetVariable + EquationShift.mathSymbols.ADD + EquationShift.state.targetVariable + EquationShift.mathSymbols.POW + "2", /* "x+x^2" */
      EquationShift.state.targetVariable + EquationShift.mathSymbols.SUB + EquationShift.state.targetVariable + EquationShift.mathSymbols.POW + "2", /* "x-x^2" */
    ];

    if ( /* if one side contains only the target variable and the other one not */
      finalStates.includes(leftEquationPart) && !rightEquationPart.includes(EquationShift.state.targetVariable)
      || finalStates.includes(rightEquationPart) && !leftEquationPart.includes(EquationShift.state.targetVariable)
    ) {
      return true;
    }

    return false;
  },

  listItemArraysAreEqual: (firstArray, secondArray) => { /* check if two arrays of list items contain the same items */
    if (firstArray.length !== secondArray.length) {
      return false;
    }

    for (let i = 0; i < firstArray.length; i++) { /* arrays must have the same order of list items */
      if (firstArray[i].id !== secondArray[i].id) {
        return false;
      }
    }

    return true;
  },

  removeChainedOperators: (mathExpression) => {
    let result = mathExpression.replace("+-", "-"); /* convert +- to - */

    return result.replace("-+", "-"); /* convert -+ to - */
  },

  handleRestructuringEvent: (el, target, source, includeLogging) => { /* handles a conversion step event and create equation conversion entries or not */
    if (source.classList.contains(EquationShift.containers.NUMERATOR) || source.classList.contains(EquationShift.containers.DENOMINATOR)) {
      source = source.parentNode.parentNode; /* replace source with high level container instead of fraction component */
    }

    if (source.classList.contains(EquationShift.containers.FRACTION)) {
      source = source.parentNode; /* replace source with high level container instead of fraction */
    }

    if (target.classList.contains(EquationShift.containers.NUMERATOR) || target.classList.contains(EquationShift.containers.DENOMINATOR)) {
      target = target.parentNode.parentNode; /* replace target with high level container instead of fraction component */
    }

    if (target.classList.contains(EquationShift.containers.FRACTION)) {
      target = target.parentNode; /* replace target with high level container instead of fraction */
    }

    const targetIsDivisionZone = [EquationShift.containers.FIRST_DIVISION_ZONE_UL, EquationShift.containers.SECOND_DIVISION_ZONE_UL].includes(target.id);
    let sourceUl = null;
    let targetUl = null;

    if (targetIsDivisionZone) { /* if user wants to divide the source is the left ul and the target is the right ul */
      sourceUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
      targetUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);
    } else {
      sourceUl = source.id === EquationShift.containers.LEFT_EQUATION_PART_UL 
        ? $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL) 
        : $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL); /* jquery copy of source ul */
      targetUl = target.id === EquationShift.containers.LEFT_EQUATION_PART_UL 
        ? $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL) 
        : $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL); /* jquery copy of target ul */
    }

    /* sets the source and target ul before dragging */
    const priorSourceUl = sourceUl.attr("id") === EquationShift.containers.LEFT_EQUATION_PART_UL ? EquationShift.state.priorLeftEquationPartUl : EquationShift.state.priorRightEquationPartUl; /* source ul before dragging */
    const priorTargetUl = targetUl.attr("id") === EquationShift.containers.LEFT_EQUATION_PART_UL ? EquationShift.state.priorLeftEquationPartUl : EquationShift.state.priorRightEquationPartUl; /* target ul before dropping */

    if ( /* if user drags and drops in same container in deactivated autoSimplification mode and did not select a sub operator */
      el.innerHTML !== EquationShift.mathSymbols.SUB /* would otherwise lead to potential preview errors */
      && !EquationShift.equationShiftConfig.autoSimplification 
      && sourceUl.attr("id") === targetUl.attr("id")
    ) {
      return {
        targetUl: targetUl,
        sourceUl: null, /* because target === source */
        targetEquationPart: EquationShift.getNextExpressionForUnilateralDragging(el, targetUl, priorTargetUl, includeLogging), /* determines expression which has to be added to the container equation */
        sourceEquationPart: null
      };
    }

    /* determines expression which has to be added to both sides of the equation */
    const nextExpressions = EquationShift.getNextExpressionsForBilateralDragging(el, priorSourceUl, priorTargetUl, targetIsDivisionZone, includeLogging);

    return { /* return the several uls and their new equation parts */
      targetUl: targetUl,
      sourceUl: sourceUl,
      targetEquationPart: nextExpressions.targetEquationPart,
      sourceEquationPart: nextExpressions.sourceEquationPart
    };
  },

  addEntryToExecutedEquationConversions: (priorLeftEquationPart, currentLeftEquationPart, priorRightEquationPart, currentRightEquationPart, conversionStep) => { /* adds new conversion step to state */
    let entry = {conversionStep: conversionStep};
    
    if (priorLeftEquationPart !== null && currentLeftEquationPart !== null) { /* one of both equation parts can be null due to unilateral dragging */
      entry.leftEquationPart = {
        before: priorLeftEquationPart,
        after: currentLeftEquationPart
      };
    }

    if (priorRightEquationPart !== null && currentRightEquationPart !== null) {
      entry.rightEquationPart = {
        before: priorRightEquationPart,
        after: currentRightEquationPart
      };
    }

    EquationShift.state.executedEquationConversions.push(entry); /* add new entry */
  },

  resetEquationShiftEnvironment: () => { /* resets the whole environment to the default state */
    EquationShift.state.startLeftEquationPart = null; /* reset state */
    EquationShift.state.startRightEquationPart = null;
    EquationShift.state.priorLeftEquationPartUl = null;
    EquationShift.state.priorRightEquationPartUl = null;
    EquationShift.state.listItemCounter = 0;
    EquationShift.state.targetVariable = null;
    EquationShift.state.executedEquationConversions = [];

    EquationShift.equationShiftConfig.supportiveMode = true; /* reset config */
    EquationShift.equationShiftConfig.groupTokens = true; 
    EquationShift.equationShiftConfig.autoSimplification = true;
    EquationShift.equationShiftConfig.lockWhenSolved = true;
    EquationShift.equationShiftConfig.showPreview = true;
    EquationShift.equationShiftConfig.prettifyFractions = false;
    EquationShift.equationShiftConfig.checkIfEquationIsSolvable = true;
    EquationShift.equationShiftConfig.simplifyEquationShiftExpression = (mathExpression) => { /* default simplify function */
      let simplifiedExpression = nerdamer("simplify(" + mathExpression + ")").toString(); /* use nerdamer to handle higher functions like sqrt and power */
  
      if (simplifiedExpression.includes("abs")) {
        simplifiedExpression = simplifiedExpression.replace("abs", ""); /* sqrt values are positive by default */
      }
    
      simplifiedExpression = math.simplify(simplifiedExpression).toString(); /* simplification of expression with mathjs to produce mathjs order of expression */
    
      simplifiedExpression = math.simplify(simplifiedExpression, [ /* simplify expression with bracket rules */
        "n1*(n2+n3) -> n1*n2+n1*n3", /* dissolve brackets */
        "n1*(n2*n3) -> n1*n2*n3"
      ]).toString();
    
      simplifiedExpression = math.simplify(simplifiedExpression).toString(); /* simplify expression because simplification with rules only considers rules */
    
      return math.simplify(simplifiedExpression, [ /* simplify expression with operator rules */
        "n1+-n2 -> n1-n2", /* prevent operator conflicts */ 
        "n1-+n2 -> n1-n2"
      ]).toString();
    };
    EquationShift.equationShiftConfig.equationIsSolvable = (leftEquationPart, rightEquationPart, targetVariable) => { /* default function for checking if equation is solvable */
      try { /* check if given equation is solvable */
        const equationResult = nerdamer.solveEquations(leftEquationPart + "=" + rightEquationPart, targetVariable).toString();

        if (!equationResult) {
          throw new Error();
        }
      } catch (e) {
        return false;
      }

      return true;
    };
  }
});

const EquationShiftAPI = Object.freeze({ /* API functions */
  initEquationShiftEnvironment: (leftEquationPart, rightEquationPart, targetVariable, equationShiftConfig) => { /* sets the equation and builds the drag and drop containers */
    EquationShift.resetEquationShiftEnvironment();

    const errorMessage = EquationShift.validateStartEquation(leftEquationPart, rightEquationPart, targetVariable); /* validate start equation */
    if (errorMessage !== "") { /* throw error if start equation is invalid */
      throw new Error(errorMessage);
    }

    EquationShift.state.startLeftEquationPart = leftEquationPart; /* set state variables */
    EquationShift.state.startRightEquationPart = rightEquationPart;
    EquationShift.state.targetVariable = targetVariable;

    if (equationShiftConfig && !jQuery.isEmptyObject(equationShiftConfig)) { /* if config is present overwrite EquationShift config */
      if ("supportiveMode" in equationShiftConfig) {
        EquationShift.equationShiftConfig.supportiveMode = equationShiftConfig.supportiveMode;
      }

      if ("groupTokens" in equationShiftConfig) {
        EquationShift.equationShiftConfig.groupTokens = equationShiftConfig.groupTokens;
      }

      if ("autoSimplification" in equationShiftConfig) {
        EquationShift.equationShiftConfig.autoSimplification = equationShiftConfig.autoSimplification;
      }

      if ("lockWhenSolved" in equationShiftConfig) {
        EquationShift.equationShiftConfig.lockWhenSolved = equationShiftConfig.lockWhenSolved;
      }

      if ("showPreview" in equationShiftConfig) {
        EquationShift.equationShiftConfig.showPreview = equationShiftConfig.showPreview;
      }

      if ("prettifyFractions" in equationShiftConfig) {
        EquationShift.equationShiftConfig.prettifyFractions = equationShiftConfig.prettifyFractions;
      }

      if ("checkIfEquationIsSolvable" in equationShiftConfig) {
        EquationShift.equationShiftConfig.checkIfEquationIsSolvable = equationShiftConfig.checkIfEquationIsSolvable;
      }

      if ("simplifyEquationShiftExpression" in equationShiftConfig) { /* simplify method is overwritable */
        EquationShift.equationShiftConfig.simplifyEquationShiftExpression = equationShiftConfig.simplifyEquationShiftExpression;
      }

      if ("equationIsSolvable" in equationShiftConfig) { /* validation method is overwritable */
        EquationShift.equationShiftConfig.equationIsSolvable = equationShiftConfig.equationIsSolvable;
      }
    }

    let leftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
    let rightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);

    leftEquationPartUl.empty(); /* clear equation part uls */
    rightEquationPartUl.empty();

    if (EquationShift.equationShiftConfig.autoSimplification) {
      /* simplify equation and start drag and drop engine */
      EquationShift.buildListItemsByMathExpression(EquationShift.equationShiftConfig.simplifyEquationShiftExpression(leftEquationPart), leftEquationPartUl);
      EquationShift.buildListItemsByMathExpression(EquationShift.equationShiftConfig.simplifyEquationShiftExpression(rightEquationPart), rightEquationPartUl);
    } else {
      /* start drag and drop engine without simplification but removing of chained operators */
      EquationShift.buildListItemsByMathExpression(EquationShift.removeChainedOperators(leftEquationPart), leftEquationPartUl);
      EquationShift.buildListItemsByMathExpression(EquationShift.removeChainedOperators(rightEquationPart), rightEquationPartUl);
    }
  },

  equationIsSolved: () => { /* hand over the inner function result to the user */
    return EquationShift.equationIsSolved();
  },

  getCorrectEquationResults: () => { /* returns the nerdamer results for the start equation */
    return nerdamer.solveEquations(
      EquationShift.state.startLeftEquationPart + "=" + EquationShift.state.startRightEquationPart, EquationShift.state.targetVariable
    ).toString().split(",");
  },

  getActualEquationResult: () => { /* returns the actual result of the user */
    if (!EquationShift.equationIsSolved()) { /* return null if equation is not solved yet */
      return null;
    }

    let leftEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat($("#" + EquationShift.containers.LEFT_EQUATION_PART_UL).children())
    );
    let rightEquationPart = EquationShift.convertListItemsToString(
      EquationShift.bringUlChildrenIntoProcessableFormat($("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL).children())
    );

    if (leftEquationPart.includes(EquationShift.state.targetVariable)) { /* result is the equation part without the target variable */
      return rightEquationPart;
    }

    return leftEquationPart;
  },

  getExecutedEquationConversions: () => { /* returns the corresponding state */
    return EquationShift.state.executedEquationConversions;
  },

  executeConversionStep: (conversionStep) => { /* takes an independent conversion step as string and executes it */
    if (EquationShift.equationShiftConfig.lockWhenSolved && EquationShift.equationIsSolved()) { /* cancel when equation environment is locked */
      return;
    }

    const leftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
    const rightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);

    let leftEquationPart = EquationShift.convertListItemsToString(EquationShift.bringUlChildrenIntoProcessableFormat(leftEquationPartUl.children()));
    let rightEquationPart = EquationShift.convertListItemsToString(EquationShift.bringUlChildrenIntoProcessableFormat(rightEquationPartUl.children()));

    let newLeftEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + leftEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
    let newRightEquationPart = EquationShift.mathSymbols.OPENING_BRACKET + rightEquationPart + EquationShift.mathSymbols.CLOSING_BRACKET + conversionStep;
    if (EquationShift.equationShiftConfig.autoSimplification) {
      newLeftEquationPart = EquationShift.equationShiftConfig.simplifyEquationShiftExpression(newLeftEquationPart);
      newRightEquationPart = EquationShift.equationShiftConfig.simplifyEquationShiftExpression(newRightEquationPart);
    } else {
      newLeftEquationPart = EquationShift.removeChainedOperators(newLeftEquationPart);
      newRightEquationPart = EquationShift.removeChainedOperators(newRightEquationPart);
    }

    leftEquationPartUl.empty();
    EquationShift.buildListItemsByMathExpression(newLeftEquationPart, leftEquationPartUl);
    rightEquationPartUl.empty();
    EquationShift.buildListItemsByMathExpression(newRightEquationPart, rightEquationPartUl);
  }
});

$(document).ready(function () {
  /* activate drag and drop engine for left and right drag and drop container and division zones */
  let drake = dragula([
    document.querySelector("#" + EquationShift.containers.LEFT_EQUATION_PART_UL), 
    document.querySelector("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL),
    document.querySelector("#" + EquationShift.containers.FIRST_DIVISION_ZONE_UL),
    document.querySelector("#" + EquationShift.containers.SECOND_DIVISION_ZONE_UL)
  ], {
    isContainer: function (el) {
      if (
        el.classList.contains(EquationShift.containers.FRACTION)
        || el.classList.contains(EquationShift.containers.NUMERATOR)
        || el.classList.contains(EquationShift.containers.DENOMINATOR)
      ) {
        return true;
      }

      return false; /* only elements in drake.containers will be taken into account */
    },
    moves: function (el, source, handle, sibling) {
      if (EquationShift.equationShiftConfig.lockWhenSolved && EquationShift.equationIsSolved()) { /* if equation is solved and config is enabled */
        return false;
      }

      if ([EquationShift.mathSymbols.ADD, EquationShift.mathSymbols.MUL, EquationShift.mathSymbols.DIV].includes(el.innerHTML)) { /* operators except sub cannot be dragged */
        return false;
      }

      if ( /* function brackets, raw closing brackets and bracket items cannot be dragged */
        el.classList.contains(EquationShift.identifiers.RAW_CLOSING_BRACKET)
        || el.classList.contains(EquationShift.identifiers.FUNCTION_OPENING_BRACKET)
        || el.classList.contains(EquationShift.identifiers.FUNCTION_CLOSING_BRACKET)
      ) {
        return false;
      }

      return true;
    },
    accepts: function (el, target, source, sibling) {
      if (source.classList.contains(EquationShift.containers.NUMERATOR) || source.classList.contains(EquationShift.containers.DENOMINATOR)) {
        source = source.parentNode.parentNode; /* replace source with high level container instead of fraction component */
      }
  
      if (source.classList.contains(EquationShift.containers.FRACTION)) {
        source = source.parentNode; /* replace source with high level container instead of fraction */
      }
  
      if (target.classList.contains(EquationShift.containers.NUMERATOR) || target.classList.contains(EquationShift.containers.DENOMINATOR)) {
        target = target.parentNode.parentNode; /* replace target with high level container instead of fraction component */
      }
  
      if (target.classList.contains(EquationShift.containers.FRACTION)) {
        target = target.parentNode; /* replace target with high level container instead of fraction */
      }

      if (EquationShift.equationShiftConfig.autoSimplification && target.id === source.id) {
        return false;
      }

      return true;
    },
    invalid: function (el, handle) {
      return false; /* don't prevent any drags from initiating by default */
    },
    direction: 'horizontal', /* li elements are dragged and dropped horizontally */
    copy: false, /* elements are moved by default, not copied */
    copySortSource: false, /* elements in copy-source containers can be reordered */
    revertOnSpill: false, /* spilling will put the element back where it was dragged from, if this is true */
    removeOnSpill: false, /* spilling will `.remove` the element, if this is true */
    mirrorContainer: document.body, /* set the element that gets mirror elements appended */
    ignoreInputTextSelection: true, /* allows users to select input text */
    slideFactorX: 0, /* allows users to select the amount of movement on the X axis before it is considered a drag instead of a click */
    slideFactorY: 0, /* allows users to select the amount of movement on the Y axis before it is considered a drag instead of a click */
  });

  drake.on("drag", function (el, source) { /* when list item is selected */
    EquationShift.state.priorLeftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL).clone(); /* left equation part ul before dragging */
    EquationShift.state.priorRightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL).clone(); /* right equation part ul before dragging */
  });

  drake.on("drop", function (el, target, source, sibling) { /* when list item is dropped in left or right drag and drop container */
    try {
      const dragAndDropData = EquationShift.handleRestructuringEvent(el, target, source, true); /* handle restructuring event with logging */

      dragAndDropData.targetUl.empty(); /* replace original target ul */
      EquationShift.buildListItemsByMathExpression(dragAndDropData.targetEquationPart, dragAndDropData.targetUl);

      if (dragAndDropData.sourceUl && dragAndDropData.sourceEquationPart) {
        dragAndDropData.sourceUl.empty(); /* replace original source ul */
        EquationShift.buildListItemsByMathExpression(dragAndDropData.sourceEquationPart, dragAndDropData.sourceUl);
      }
    } catch (e) { /* restore old state */
      let leftEquationPartUl = $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL);
      leftEquationPartUl.empty(); /* restore left ul */
      EquationShift.buildListItemsByMathExpression(
        EquationShift.convertListItemsToString(
          EquationShift.bringUlChildrenIntoProcessableFormat(EquationShift.state.priorLeftEquationPartUl.children())
        ), 
        leftEquationPartUl
      );

      let rightEquationPartUl = $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL);
      rightEquationPartUl.empty(); /* restore right ul */
      EquationShift.buildListItemsByMathExpression(
        EquationShift.convertListItemsToString(
          EquationShift.bringUlChildrenIntoProcessableFormat(EquationShift.state.priorRightEquationPartUl.children())
        ), 
        rightEquationPartUl
      );
    }

    $("#" + EquationShift.containers.FIRST_DIVISION_ZONE_UL).empty(); /* clear division zones */
    $("#" + EquationShift.containers.SECOND_DIVISION_ZONE_UL).empty();
  });

  drake.on("shadow", function (el, container, source) { /* when list item shadow is dragged over container */
    if (EquationShift.equationShiftConfig.showPreview) {
      try {
        const dragAndDropData = EquationShift.handleRestructuringEvent(el, container, source, false); /* handle restructuring event without logging */

        dragAndDropData.targetUl.attr("data-tooltip", dragAndDropData.targetEquationPart); /* show preview for both equation parts in tooltips */

        if (dragAndDropData.sourceUl !== null && dragAndDropData.sourceEquationPart !== null) { /* only activate source tooltip if source is given */
          dragAndDropData.sourceUl.attr("data-tooltip", dragAndDropData.sourceEquationPart);
        }
      } catch (e) {
        /* ignore */
      }
    }
  });

  drake.on("out", function (el, container, source) { /* when list item is dragged out of container */
    $("#" + EquationShift.containers.LEFT_EQUATION_PART_UL).removeAttr("data-tooltip"); /* remove preview tooltips */
    $("#" + EquationShift.containers.RIGHT_EQUATION_PART_UL).removeAttr("data-tooltip");
  });

  $(document).on("touchmove", function (event) { event.preventDefault(); }, { passive: false }); /* prevents site from scrolling when items are dragged */
});
