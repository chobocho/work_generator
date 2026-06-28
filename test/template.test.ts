/// <reference path="../src/types.ts" />
/// <reference path="../src/template.ts" />

// Minimal ambient declarations so the test compiles without the DOM lib.
declare const console: { log(...args: unknown[]): void; error(...args: unknown[]): void };

/**
 * Minimal dependency-free test runner for the pure template engine.
 * Compiled together with the engine via tsconfig.test.json and run under Node.
 */
namespace TestRunner {
  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, msg: string): void {
    if (cond) {
      passed++;
    } else {
      failed++;
      console.error("  FAIL: " + msg);
    }
  }

  function eq<T>(actual: T, expected: T, msg: string): void {
    assert(actual === expected, `${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }

  const TE = App.TemplateEngine;

  // --- parsePlaceholders ---------------------------------------------------
  function testParseSimple(): void {
    const ps = TE.parsePlaceholders("Title: {%제목%}");
    eq(ps.length, 1, "parse simple count");
    eq(ps[0].key, "제목", "parse simple key");
    eq(ps[0].index, "", "parse simple index");
    eq(ps[0].raw, "{%제목%}", "parse simple raw");
  }

  function testParseIndexed(): void {
    const ps = TE.parsePlaceholders("{%목표%1} and {%목표%2} and {%목표%3}");
    eq(ps.length, 3, "parse indexed count");
    eq(ps[0].key, "목표1", "parse indexed key 1");
    eq(ps[2].name, "목표", "parse indexed name");
    eq(ps[2].index, "3", "parse indexed index");
  }

  function testParseDedup(): void {
    const ps = TE.parsePlaceholders("{%제목%} repeated {%제목%}");
    eq(ps.length, 1, "parse dedup");
  }

  function testParseMixed(): void {
    const ps = TE.parsePlaceholders("{%언어1%}/{%언어2%}/{%목표%1}");
    eq(ps.length, 3, "parse mixed count");
    eq(ps[0].key, "언어1", "parse mixed key lang1");
    eq(ps[2].key, "목표1", "parse mixed key goal1");
  }

  // --- merge ---------------------------------------------------------------
  function testMergeBasic(): void {
    const out = TE.merge("Hello {%제목%}!", { "제목": "World" });
    eq(out, "Hello World!", "merge basic");
  }

  function testMergeIndexed(): void {
    const out = TE.merge("{%목표%1}-{%목표%2}", { "목표1": "A", "목표2": "B" });
    eq(out, "A-B", "merge indexed");
  }

  function testMergeKeepsUnfilled(): void {
    const out = TE.merge("{%제목%}/{%언어1%}", { "제목": "X" });
    eq(out, "X/{%언어1%}", "merge keeps unfilled placeholder");
  }

  function testMergeEmptyValueKept(): void {
    const out = TE.merge("{%제목%}", { "제목": "   " });
    eq(out, "{%제목%}", "merge treats whitespace-only as empty");
  }

  // --- generate (drop unfilled lines on save) ------------------------------
  function testGenerateDropsUnfilledLine(): void {
    const out = TE.generate("a\n- {%목표%1}\nb", {});
    eq(out, "a\nb", "generate drops the unfilled placeholder line");
  }

  function testGenerateKeepsFilledLine(): void {
    const out = TE.generate("- {%목표%1}", { "목표1": "go" });
    eq(out, "- go", "generate keeps and fills a filled line");
  }

  function testGenerateMixed(): void {
    const tpl = "x\n- {%목표%1}\n- {%목표%2}\ny";
    const out = TE.generate(tpl, { "목표1": "A" });
    eq(out, "x\n- A\ny", "generate keeps filled goal, drops empty goal");
  }

  function testGenerateWhitespaceIsEmpty(): void {
    const out = TE.generate("keep\n{%제목%}", { "제목": "   " });
    eq(out, "keep", "generate treats whitespace-only value as empty");
  }

  // --- completeness --------------------------------------------------------
  function testCompleteness(): void {
    const tpl = "{%제목%}-{%언어1%}";
    assert(!TE.isComplete(tpl, { "제목": "a" }), "incomplete when missing");
    assert(TE.isComplete(tpl, { "제목": "a", "언어1": "b" }), "complete when all set");
    eq(TE.remainingCount(tpl, { "제목": "a" }), 1, "remaining count = 1");
    eq(TE.remainingCount(tpl, {}), 2, "remaining count = 2");
  }

  export function run(): void {
    testParseSimple();
    testParseIndexed();
    testParseDedup();
    testParseMixed();
    testMergeBasic();
    testMergeIndexed();
    testMergeKeepsUnfilled();
    testMergeEmptyValueKept();
    testGenerateDropsUnfilledLine();
    testGenerateKeepsFilledLine();
    testGenerateMixed();
    testGenerateWhitespaceIsEmpty();
    testCompleteness();

    console.log(`\nTemplate engine tests: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      // Non-zero exit so CI / build fails loudly.
      (globalThis as { process?: { exitCode?: number } }).process!.exitCode = 1;
    }
  }
}

TestRunner.run();
