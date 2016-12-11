import mocha from 'mocha';
import should from 'should/as-function';

import utils from '../../src/bot/utils';

describe('Util Helpers', () => {
  it('should escape mustaches', () => {
    should(utils.quotemeta('hello{world}', true)).equal('hello\\{world\\}');
    should(utils.quotemeta('hello{world}', false)).equal('hello\\{world\\}');
  });

  it('should only escape pipes when not in commands mode', () => {
    should(utils.quotemeta('hello|world', true)).equal('hello|world');
    should(utils.quotemeta('hello|world', false)).equal('hello\\|world');
  });

  it('should trim space from string', () => {
    should(utils.trim('  hello \t\tworld ')).equal('hello world');
  });

  it('should preserve newlines in strings', () => {
    should(utils.trim('  hello \n  world ')).equal('hello \n world');
  });

  it('should count words', () => {
    should(utils.wordCount('hello_world#this is a very*odd*string')).equal(8);
  });

  it('should replace captured text', () => {
    const parts = ['hello <cap>', '', 'how are you <cap2> today', '<cap1>, meet <cap3>'];
    const stars = ['', 'Dave', 'feeling', 'Sally'];
    const replaced = utils.replaceCapturedText(parts, stars);
    should(replaced.length).equal(3);
    should(replaced[0]).equal('hello Dave');
    should(replaced[1]).equal('how are you feeling today');
    should(replaced[2]).equal('Dave, meet Sally');
  });
});
