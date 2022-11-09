$(document).ready(function () {
    $("#start-button").on("click", function (event) {
        const leftEquationPartInput = $("#left-equation-part-input");
        const rightEquationPartInput = $("#right-equation-part-input");
        const targetVariableInput = $("#target-variable-input");
        const supportiveModeCheckbox = $("#supportive-mode-checkbox");
        const groupTokensCheckbox = $("#group-tokens-checkbox");
        const autoSimplificationCheckbox = $("#auto-simplification-checkbox");
        const lockWhenSolvedCheckbox = $("#lock-when-solved-checkbox");
        const previewCheckbox = $("#preview-checkbox");
        const prettifyFractionsCheckbox = $("#prettify-fractions-checkbox");

        try {
            EquationShiftAPI.initEquationShiftEnvironment( /* init environment */
                leftEquationPartInput.val(), 
                rightEquationPartInput.val(),
                targetVariableInput.val(),
                {
                    supportiveMode: supportiveModeCheckbox.is(":checked"),
                    groupTokens: groupTokensCheckbox.is(":checked"),
                    autoSimplification: autoSimplificationCheckbox.is(":checked"),
                    lockWhenSolved: lockWhenSolvedCheckbox.is(":checked"),
                    showPreview: previewCheckbox.is(":checked"),
                    prettifyFractions: prettifyFractionsCheckbox.is(":checked")
                }
            );
        } catch (e) { /* validation errors */
            alert(e.message);
        }
    });

    $("#eval-button").on("click", function (event) {
        if (!EquationShiftAPI.equationIsSolved()) { /* evaluation is possible when the equation is solved */
            alert("Bitte lösen Sie zunächst die Gleichung.");

            return;
        }

        $("#eval-modal").modal("show"); /* open modal */

        $("#correct-results").empty(); /* reset elements */
        $("#result").empty();
        $("#step-amount").empty();
        $("#steps").empty();

        const equationConversions = EquationShiftAPI.getExecutedEquationConversions();

        $("#correct-results").append(EquationShiftAPI.getCorrectEquationResults().toString()); /* fill modal with equation shift data */
        $("#result").append(EquationShiftAPI.getActualEquationResult());
        $("#step-amount").append(equationConversions.length);

        let i = 1;
        equationConversions.forEach((conversion) => {
            $("#steps").append("<br><span><strong>" + i + ".</strong> [" 
                + ("leftEquationPart" in conversion ? "left: " + conversion.leftEquationPart.before : "")
                + ("rightEquationPart" in conversion ? ("leftEquationPart" in conversion ? ", " : "") + "right: " + conversion.rightEquationPart.before : "")
                + "] => " + conversion.conversionStep + " => ["
                + ("leftEquationPart" in conversion ? "left: " + conversion.leftEquationPart.after : "")
                + ("rightEquationPart" in conversion ? ("leftEquationPart" in conversion ? ", " : "") + "right: " + conversion.rightEquationPart.after : "")
                + "]</span>");

            i++;
        });
    });

    $("#help-button").on("click", function (event) {
        $("#help-modal").modal("show"); /* open modal */
    });
});
