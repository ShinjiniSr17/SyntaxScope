function analyzeCode() {

    let input = document.getElementById("codeInput").value;
    let syntaxResult = document.getElementById("syntaxResult");
    let errorMessages = document.getElementById("errorMessages");
    let tokenTable = document.getElementById("tokenTable");

    syntaxResult.innerHTML = "";
    errorMessages.innerHTML = "";
    tokenTable.innerHTML = "";

    let lines = input.split("\n");
    let hasError = false;

    let declaredVariables = [];   // For semantic checking

    // =============================
    // 🔹 LEXICAL ANALYSIS (Tokens)
    // =============================
    let tokens = input.match(/\bint\b|\bfloat\b|\bchar\b|[a-zA-Z]+|\d+|[\+\-\*\/=;]/g);

    if (tokens) {
        tokens.forEach(token => {

            let type = "";

            if (token === "int") type = "Keyword";
            else if (token === "float" || token === "char") type = "Keyword";
            else if (/^[a-zA-Z]+$/.test(token)) type = "Identifier";
            else if (/^\d+$/.test(token)) type = "Number";
            else if (/^[\+\-\*\/]$/.test(token)) type = "Operator";
            else if (token === "=") type = "Assignment Operator";
            else if (token === ";") type = "Semicolon";

            tokenTable.innerHTML += 
                `<tr><td>${token}</td><td>${type}</td></tr>`;
        });
    }

    // =============================
    // 🔹 SYNTAX + SEMANTIC ANALYSIS
    // =============================

    lines.forEach((line, index) => {

        line = line.trim();
        if (line === "") return;

        // 1️⃣ Missing semicolon
        if (!line.endsWith(";")) {
            hasError = true;
            errorMessages.innerHTML += 
                `Line ${index+1}: Missing semicolon <br>`;
            return;
        }

        line = line.replace(";", "");

        // 2️⃣ Unsupported datatype
        if (line.startsWith("float") || line.startsWith("char")) {
            hasError = true;
            errorMessages.innerHTML += 
                `Line ${index+1}: Unsupported data type <br>`;
            return;
        }

        // 3️⃣ Declaration
        if (line.startsWith("int")) {

            let parts = line.split(/\s+/);

            if (parts.length !== 2 || !/^[a-zA-Z]+$/.test(parts[1])) {
                hasError = true;
                errorMessages.innerHTML += 
                    `Line ${index+1}: Invalid identifier name <br>`;
            } else {
                declaredVariables.push(parts[1]);
            }

            return;
        }

        // 4️⃣ Assignment
        if (line.includes("=")) {

            let assignParts = line.split("=");

            if (assignParts.length !== 2) {
                hasError = true;
                errorMessages.innerHTML += 
                    `Line ${index+1}: Invalid assignment structure <br>`;
                return;
            }

            let left = assignParts[0].trim();
            let right = assignParts[1].trim();

            // Check left side variable
            if (!/^[a-zA-Z]+$/.test(left)) {
                hasError = true;
                errorMessages.innerHTML += 
                    `Line ${index+1}: Invalid variable on left side <br>`;
                return;
            }

            // Check undeclared variable
            if (!declaredVariables.includes(left)) {
                hasError = true;
                errorMessages.innerHTML += 
                    `Line ${index+1}: Undeclared variable '${left}' <br>`;
                return;
            }

            // Check expression format
            if (!/^[a-zA-Z0-9]+\s*[\+\-\*\/]\s*[a-zA-Z0-9]+$/.test(right)) {
                hasError = true;
                errorMessages.innerHTML += 
                    `Line ${index+1}: Invalid arithmetic expression <br>`;
                return;
            }

            // Check if identifiers in expression are declared
            let exprParts = right.split(/[\+\-\*\/]/);

            exprParts.forEach(part => {
                let value = part.trim();

                if (/^[a-zA-Z]+$/.test(value) && 
                    !declaredVariables.includes(value)) {

                    hasError = true;
                    errorMessages.innerHTML += 
                        `Line ${index+1}: Undeclared variable '${value}' <br>`;
                }
            });

            return;
        }

        // 5️⃣ Completely invalid statement
        hasError = true;
        errorMessages.innerHTML += 
            `Line ${index+1}: Invalid statement <br>`;

    });

    // =============================
    // 🔹 Final Result
    // =============================

    if (!hasError) {
        syntaxResult.innerHTML = "Syntax Analysis Successful ✔";
    } else {
        syntaxResult.innerHTML = "Syntax Analysis Failed ❌";
    }

}