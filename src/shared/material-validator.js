const LIMITS = Object.freeze({
  fileBytes: 2 * 1024 * 1024,
  title: 240,
  subject: 160,
  yearGroup: 120,
  level: 80,
  objectives: 40,
  objective: 800,
  sourceText: 500000,
  vocabulary: 500,
  vocabularyItem: 250,
  tasks: 500,
  prompt: 6000,
  options: 100,
  option: 2000,
  explanation: 12000,
});
const QUALITY = new Set([
  "ai-draft",
  "teacher-reviewed",
  "classroom-tested",
  "commission-reviewed",
]);
const TASK_TYPES = new Set(["select", "truefalse", "short", "open", "order"]);
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function push(errors, path, code, cs, en) {
  errors.push({ path, code, cs, en });
}
function stringCheck(errors, value, path, required, max) {
  if (typeof value !== "string") {
    push(
      errors,
      path,
      "type",
      `${path} musí být text.`,
      `${path} must be text.`,
    );
    return;
  }
  if (required && !value.trim())
    push(
      errors,
      path,
      "required",
      `${path} nesmí být prázdné.`,
      `${path} must not be empty.`,
    );
  if (value.length > max)
    push(
      errors,
      path,
      "too-long",
      `${path} překračuje limit ${max} znaků.`,
      `${path} exceeds the ${max}-character limit.`,
    );
}
export function validateMaterialPackage(material) {
  const errors = [];
  if (!isPlainObject(material)) {
    push(
      errors,
      "$",
      "type",
      "Kořen souboru musí být objekt.",
      "The file root must be an object.",
    );
    return { valid: false, errors, limits: LIMITS };
  }
  if (material.schema !== "ghrab-material-v1")
    push(
      errors,
      "schema",
      "schema",
      "Soubor není GHRAB Material v1.",
      "The file is not GHRAB Material v1.",
    );
  stringCheck(errors, material.id, "id", true, 180);
  if (!Number.isInteger(material.version) || material.version < 1)
    push(
      errors,
      "version",
      "version",
      "Verze musí být celé číslo alespoň 1.",
      "Version must be an integer of at least 1.",
    );
  stringCheck(errors, material.title, "title", true, LIMITS.title);
  stringCheck(errors, material.subject, "subject", true, LIMITS.subject);
  if (material.yearGroup != null)
    stringCheck(
      errors,
      material.yearGroup,
      "yearGroup",
      false,
      LIMITS.yearGroup,
    );
  if (material.level != null)
    stringCheck(errors, material.level, "level", false, LIMITS.level);
  if (material.language != null)
    stringCheck(errors, material.language, "language", false, 24);
  if (!Array.isArray(material.objectives))
    push(
      errors,
      "objectives",
      "type",
      "Výukové cíle musí být pole.",
      "Learning objectives must be an array.",
    );
  else {
    if (material.objectives.length > LIMITS.objectives)
      push(
        errors,
        "objectives",
        "too-many",
        `Soubor obsahuje více než ${LIMITS.objectives} cílů.`,
        `The file contains more than ${LIMITS.objectives} objectives.`,
      );
    material.objectives.forEach((value, index) =>
      stringCheck(
        errors,
        value,
        `objectives[${index}]`,
        true,
        LIMITS.objective,
      ),
    );
  }
  if (!isPlainObject(material.content))
    push(
      errors,
      "content",
      "type",
      "Chybí objekt content.",
      "The content object is missing.",
    );
  else {
    stringCheck(
      errors,
      material.content.sourceText,
      "content.sourceText",
      false,
      LIMITS.sourceText,
    );
    if (material.content.vocabulary != null) {
      if (!Array.isArray(material.content.vocabulary))
        push(
          errors,
          "content.vocabulary",
          "type",
          "Slovní zásoba musí být pole.",
          "Vocabulary must be an array.",
        );
      else {
        if (material.content.vocabulary.length > LIMITS.vocabulary)
          push(
            errors,
            "content.vocabulary",
            "too-many",
            `Slovní zásoba překračuje ${LIMITS.vocabulary} položek.`,
            `Vocabulary exceeds ${LIMITS.vocabulary} items.`,
          );
        material.content.vocabulary.forEach((value, index) =>
          stringCheck(
            errors,
            value,
            `content.vocabulary[${index}]`,
            false,
            LIMITS.vocabularyItem,
          ),
        );
      }
    }
    if (material.content.tasks != null) {
      if (!Array.isArray(material.content.tasks))
        push(
          errors,
          "content.tasks",
          "type",
          "Úlohy musí být pole.",
          "Tasks must be an array.",
        );
      else {
        if (material.content.tasks.length > LIMITS.tasks)
          push(
            errors,
            "content.tasks",
            "too-many",
            `Soubor obsahuje více než ${LIMITS.tasks} úloh.`,
            `The file contains more than ${LIMITS.tasks} tasks.`,
          );
        material.content.tasks.forEach((task, index) => {
          const base = `content.tasks[${index}]`;
          if (!isPlainObject(task)) {
            push(
              errors,
              base,
              "type",
              "Úloha musí být objekt.",
              "A task must be an object.",
            );
            return;
          }
          stringCheck(errors, task.id, `${base}.id`, true, 180);
          if (!TASK_TYPES.has(task.type))
            push(
              errors,
              `${base}.type`,
              "enum",
              "Úloha obsahuje nepodporovaný typ.",
              "The task contains an unsupported type.",
            );
          stringCheck(
            errors,
            task.prompt,
            `${base}.prompt`,
            true,
            LIMITS.prompt,
          );
          if (task.options != null) {
            if (!Array.isArray(task.options))
              push(
                errors,
                `${base}.options`,
                "type",
                "Možnosti musí být pole.",
                "Options must be an array.",
              );
            else {
              if (task.options.length > LIMITS.options)
                push(
                  errors,
                  `${base}.options`,
                  "too-many",
                  `Úloha má více než ${LIMITS.options} možností.`,
                  `The task has more than ${LIMITS.options} options.`,
                );
              task.options.forEach((value, optionIndex) =>
                stringCheck(
                  errors,
                  value,
                  `${base}.options[${optionIndex}]`,
                  false,
                  LIMITS.option,
                ),
              );
            }
          }
          if (task.explanation != null)
            stringCheck(
              errors,
              task.explanation,
              `${base}.explanation`,
              false,
              LIMITS.explanation,
            );
          if (
            task.difficulty != null &&
            (!Number.isInteger(task.difficulty) ||
              task.difficulty < 1 ||
              task.difficulty > 3)
          )
            push(
              errors,
              `${base}.difficulty`,
              "range",
              "Obtížnost musí být 1, 2 nebo 3.",
              "Difficulty must be 1, 2 or 3.",
            );
        });
      }
    }
  }
  if (!isPlainObject(material.quality))
    push(
      errors,
      "quality",
      "type",
      "Chybí objekt quality.",
      "The quality object is missing.",
    );
  else if (!QUALITY.has(material.quality.status))
    push(
      errors,
      "quality.status",
      "enum",
      "Stav kvality není podporován.",
      "The quality status is not supported.",
    );
  if (material.provenance != null && !isPlainObject(material.provenance))
    push(
      errors,
      "provenance",
      "type",
      "Provenance musí být objekt.",
      "Provenance must be an object.",
    );
  return { valid: errors.length === 0, errors, limits: LIMITS };
}
export function validateMaterialFile(file) {
  if (!file)
    return {
      valid: false,
      errors: [
        {
          path: "file",
          code: "missing",
          cs: "Nebyl vybrán soubor.",
          en: "No file was selected.",
        },
      ],
      limits: LIMITS,
    };
  if (file.size > LIMITS.fileBytes)
    return {
      valid: false,
      errors: [
        {
          path: "file",
          code: "too-large",
          cs: `Soubor překračuje limit ${Math.round(LIMITS.fileBytes / 1024 / 1024)} MB.`,
          en: `The file exceeds the ${Math.round(LIMITS.fileBytes / 1024 / 1024)} MB limit.`,
        },
      ],
      limits: LIMITS,
    };
  return { valid: true, errors: [], limits: LIMITS };
}
export { LIMITS as MATERIAL_LIMITS };
