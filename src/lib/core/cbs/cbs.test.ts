/**
 * CBS Runtime Tests
 * 
 * CBS 런타임 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  CBSRuntime, 
  evaluateCBS, 
  parseCBS, 
  extractVariables,
  createDefaultContext,
  type CBSContext 
} from './index';

describe('CBS Parser', () => {
  describe('parseCBS', () => {
    it('should parse plain text', () => {
      const nodes = parseCBS('Hello World');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect(nodes[0].value).toBe('Hello World');
    });

    it('should parse simple command', () => {
      const nodes = parseCBS('{{char}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('command');
      expect(nodes[0].command).toBe('char');
    });

    it('should parse command with arguments', () => {
      const nodes = parseCBS('{{getvar::hp}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('command');
      expect(nodes[0].command).toBe('getvar');
      expect(nodes[0].args).toEqual(['hp']);
    });

    it('should parse command with multiple arguments', () => {
      const nodes = parseCBS('{{setvar::hp::100}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].command).toBe('setvar');
      expect(nodes[0].args).toEqual(['hp', '100']);
    });

    it('should parse nested CBS in arguments', () => {
      const nodes = parseCBS('{{setvar::hp::{{calc::50+50}}}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].args?.[1]).toBe('{{calc::50+50}}');
    });

    it('should parse mixed text and commands', () => {
      const nodes = parseCBS('Hello {{char}}, how are you?');
      expect(nodes).toHaveLength(3);
      expect(nodes[0].type).toBe('text');
      expect(nodes[1].type).toBe('command');
      expect(nodes[2].type).toBe('text');
    });

    it('should parse block commands', () => {
      const nodes = parseCBS('{{#when 1}}content{{/when}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('block');
      expect(nodes[0].command).toBe('#when');
      expect(nodes[0].children).toHaveLength(1);
    });

    it('should parse comments', () => {
      const nodes = parseCBS('{{// this is a comment}}');
      expect(nodes).toHaveLength(1);
      expect(nodes[0].command).toBe('//');
    });
  });

  describe('extractVariables', () => {
    it('should extract getvar variables', () => {
      const vars = extractVariables('HP: {{getvar::hp}}');
      expect(vars).toContainEqual({ name: 'hp', type: 'chatVar', operation: 'get' });
    });

    it('should extract setvar variables', () => {
      const vars = extractVariables('{{setvar::hp::100}}');
      expect(vars).toContainEqual({ name: 'hp', type: 'chatVar', operation: 'set' });
    });

    it('should extract multiple variables', () => {
      const vars = extractVariables('{{setvar::hp::100}}{{getvar::hp}}');
      expect(vars).toHaveLength(2);
    });
  });
});

describe('CBS Runtime', () => {
  let runtime: CBSRuntime;
  let ctx: CBSContext;

  beforeEach(() => {
    runtime = new CBSRuntime();
    ctx = createDefaultContext();
    ctx.char = { name: 'TestBot' };
    ctx.user = 'TestUser';
  });

  describe('Basic Commands', () => {
    it('should evaluate {{char}}', () => {
      const result = runtime.evaluate('{{char}}', ctx);
      expect(result.output).toBe('TestBot');
    });

    it('should evaluate {{user}}', () => {
      const result = runtime.evaluate('{{user}}', ctx);
      expect(result.output).toBe('TestUser');
    });

    it('should evaluate {{blank}}', () => {
      const result = runtime.evaluate('{{blank}}', ctx);
      expect(result.output).toBe('');
    });

    it('should evaluate {{br}}', () => {
      const result = runtime.evaluate('{{br}}', ctx);
      expect(result.output).toBe('\n');
    });

    it('should evaluate mixed text and commands', () => {
      const result = runtime.evaluate('Hello {{char}}!', ctx);
      expect(result.output).toBe('Hello TestBot!');
    });
  });

  describe('Variable Commands', () => {
    it('should set and get chat variables', () => {
      runtime.evaluate('{{setvar::hp::100}}', ctx);
      const result = runtime.evaluate('{{getvar::hp}}', ctx);
      expect(result.output).toBe('100');
    });

    it('should add to variables', () => {
      ctx.chatVars.hp = '50';
      runtime.evaluate('{{addvar::hp::25}}', ctx);
      const result = runtime.evaluate('{{getvar::hp}}', ctx);
      expect(result.output).toBe('75');
    });

    it('should set default variable only when empty', () => {
      runtime.evaluate('{{setdefaultvar::hp::100}}', ctx);
      expect(ctx.chatVars.hp).toBe('100');
      
      runtime.evaluate('{{setdefaultvar::hp::200}}', ctx);
      expect(ctx.chatVars.hp).toBe('100');
    });

    it('should handle temp variables', () => {
      const result = runtime.evaluate('{{settempvar::x::hello}}{{tempvar::x}}', ctx);
      expect(result.output).toBe('hello');
    });
  });

  describe('Math Commands', () => {
    it('should evaluate {{calc}}', () => {
      const result = runtime.evaluate('{{calc::2+3*4}}', ctx);
      expect(result.output).toBe('14');
    });

    it('should evaluate {{round}}', () => {
      expect(runtime.evaluate('{{round::3.7}}', ctx).output).toBe('4');
      expect(runtime.evaluate('{{round::3.2}}', ctx).output).toBe('3');
    });

    it('should evaluate {{floor}}', () => {
      expect(runtime.evaluate('{{floor::3.9}}', ctx).output).toBe('3');
    });

    it('should evaluate {{ceil}}', () => {
      expect(runtime.evaluate('{{ceil::3.1}}', ctx).output).toBe('4');
    });

    it('should evaluate {{abs}}', () => {
      expect(runtime.evaluate('{{abs::-5}}', ctx).output).toBe('5');
    });

    it('should evaluate {{min}} and {{max}}', () => {
      expect(runtime.evaluate('{{min::5::2::8}}', ctx).output).toBe('2');
      expect(runtime.evaluate('{{max::5::2::8}}', ctx).output).toBe('8');
    });

    it('should evaluate {{sum}} and {{average}}', () => {
      expect(runtime.evaluate('{{sum::1::2::3}}', ctx).output).toBe('6');
      expect(runtime.evaluate('{{average::2::4::6}}', ctx).output).toBe('4');
    });
  });

  describe('Comparison Commands', () => {
    it('should evaluate {{equal}}', () => {
      expect(runtime.evaluate('{{equal::a::a}}', ctx).output).toBe('1');
      expect(runtime.evaluate('{{equal::a::b}}', ctx).output).toBe('0');
    });

    it('should evaluate {{notequal}}', () => {
      expect(runtime.evaluate('{{notequal::a::b}}', ctx).output).toBe('1');
    });

    it('should evaluate {{greater}} and {{less}}', () => {
      expect(runtime.evaluate('{{greater::10::5}}', ctx).output).toBe('1');
      expect(runtime.evaluate('{{less::5::10}}', ctx).output).toBe('1');
    });

    it('should evaluate {{and}} and {{or}}', () => {
      expect(runtime.evaluate('{{and::1::1}}', ctx).output).toBe('1');
      expect(runtime.evaluate('{{and::1::0}}', ctx).output).toBe('0');
      expect(runtime.evaluate('{{or::1::0}}', ctx).output).toBe('1');
      expect(runtime.evaluate('{{or::0::0}}', ctx).output).toBe('0');
    });

    it('should evaluate {{not}}', () => {
      expect(runtime.evaluate('{{not::1}}', ctx).output).toBe('0');
      expect(runtime.evaluate('{{not::0}}', ctx).output).toBe('1');
    });
  });

  describe('String Commands', () => {
    it('should evaluate {{length}}', () => {
      expect(runtime.evaluate('{{length::hello}}', ctx).output).toBe('5');
    });

    it('should evaluate {{upper}} and {{lower}}', () => {
      expect(runtime.evaluate('{{upper::hello}}', ctx).output).toBe('HELLO');
      expect(runtime.evaluate('{{lower::HELLO}}', ctx).output).toBe('hello');
    });

    it('should evaluate {{capitalize}}', () => {
      expect(runtime.evaluate('{{capitalize::hello world}}', ctx).output).toBe('Hello world');
    });

    it('should evaluate {{trim}}', () => {
      expect(runtime.evaluate('{{trim::  hello  }}', ctx).output).toBe('hello');
    });

    it('should evaluate {{replace}}', () => {
      expect(runtime.evaluate('{{replace::hello world::o::0}}', ctx).output).toBe('hell0 w0rld');
    });

    it('should evaluate {{startswith}} and {{endswith}}', () => {
      expect(runtime.evaluate('{{startswith::hello::hel}}', ctx).output).toBe('1');
      expect(runtime.evaluate('{{endswith::hello::llo}}', ctx).output).toBe('1');
    });

    it('should evaluate {{contains}}', () => {
      expect(runtime.evaluate('{{contains::hello world::lo wo}}', ctx).output).toBe('1');
    });
  });

  describe('Array Commands', () => {
    it('should evaluate {{makearray}}', () => {
      const result = runtime.evaluate('{{makearray::a::b::c}}', ctx);
      expect(JSON.parse(result.output)).toEqual(['a', 'b', 'c']);
    });

    it('should evaluate {{arraylength}}', () => {
      expect(runtime.evaluate('{{arraylength::["a","b","c"]}}', ctx).output).toBe('3');
    });

    it('should evaluate {{arrayelement}}', () => {
      expect(runtime.evaluate('{{arrayelement::["a","b","c"]::1}}', ctx).output).toBe('b');
    });

    it('should evaluate {{arraypush}}', () => {
      const result = runtime.evaluate('{{arraypush::["a","b"]::c}}', ctx);
      expect(JSON.parse(result.output)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Conditional Blocks', () => {
    it('should evaluate #when with true condition', () => {
      const result = runtime.evaluate('{{#when 1}}yes{{/when}}', ctx);
      expect(result.output).toBe('yes');
    });

    it('should evaluate #when with false condition', () => {
      const result = runtime.evaluate('{{#when 0}}yes{{/when}}', ctx);
      expect(result.output).toBe('');
    });

    it('should evaluate #when with :else', () => {
      const result = runtime.evaluate('{{#when 0}}yes{{:else}}no{{/when}}', ctx);
      expect(result.output).toBe('no');
    });

    it('should evaluate #when with operators', () => {
      const result = runtime.evaluate('{{#when::5::>::3}}greater{{/when}}', ctx);
      expect(result.output).toBe('greater');
    });

    it('should evaluate #when with not operator', () => {
      const result = runtime.evaluate('{{#when::not::0}}negated{{/when}}', ctx);
      expect(result.output).toBe('negated');
    });

    it('should evaluate #when with and operator', () => {
      const result = runtime.evaluate('{{#when::1::and::1}}both{{/when}}', ctx);
      expect(result.output).toBe('both');
    });
  });

  describe('Comments', () => {
    it('should evaluate {{//}} as empty', () => {
      const result = runtime.evaluate('before{{// comment}}after', ctx);
      expect(result.output).toBe('beforeafter');
    });
  });

  describe('Nested CBS', () => {
    it('should evaluate nested commands in arguments', () => {
      ctx.chatVars.x = '5';
      const result = runtime.evaluate('{{calc::{{getvar::x}}+10}}', ctx);
      expect(result.output).toBe('15');
    });

    it('should evaluate nested conditionals', () => {
      ctx.chatVars.hp = '30';
      const code = '{{#when::{{getvar::hp}}::>::25}}healthy{{/when}}';
      const result = runtime.evaluate(code, ctx);
      expect(result.output).toBe('healthy');
    });
  });

  describe('Trace and Errors', () => {
    it('should record trace information', () => {
      const result = runtime.evaluate('{{char}}', ctx);
      expect(result.trace).toHaveLength(1);
      expect(result.trace[0].command).toBe('char');
      expect(result.trace[0].result).toBe('TestBot');
    });

    it('should record errors for unknown commands', () => {
      const result = runtime.evaluate('{{unknowncommand}}', ctx);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warning');
    });
  });
});

describe('evaluateCBS convenience function', () => {
  it('should work with default context', () => {
    const result = evaluateCBS('{{calc::1+1}}');
    expect(result.output).toBe('2');
  });

  it('should work with custom context', () => {
    const result = evaluateCBS('{{char}}', { char: { name: 'MyBot' } });
    expect(result.output).toBe('MyBot');
  });
});
