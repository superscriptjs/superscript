const should = require('should')

const regexes = require('../lib/regexes')

describe('The shared regular expressions', function() {

  it('redirect should match mustachioed reply names', function() {
    // const m = regexes.redirect.match('{@__greeting__} How are you today?')
    const m = '{@__greeting__} How are you today?'.match(regexes.redirect)
    m[1].should.equal('__greeting__')
    m.index.should.equal(0)
  })

  it('redirect should not match mustachioed bare words', function() {
    // const m = regexes.redirect.match('{keep} Hi, good to see you!')
    const m = '{keep} Hi, good to see you!'.match(regexes.redirect)
    should.not.exist(m)
  })

  it('topic should match “^topicRedirect” expressions', function() {
    // const m = regexes.topic.match('hello ^topicRedirect(topicName,trigger) ')
    const m = 'hello ^topicRedirect(topicName,trigger) '.match(regexes.topic)
    m[1].should.equal('topicName')
    m[2].should.equal('trigger')
    m.index.should.equal(6)
  })

  it('respond should match “^respond(topicName)” expressions', function() {
    // const m = regexes.respond.match('hello ^respond(topicName) ')
    const m = 'hello ^respond(topicName) '.match(regexes.respond)
    m[1].should.equal('topicName')
    m.index.should.equal(6)
  })

  it('customFn should match “^functionName(arg1,<cap>)” expressions', function() {
    // const m = regexes.customFn.match('the weather is ^getWeather(today,<cap>) today')
    const m = 'the weather is ^getWeather(today,<cap>) today'.match(regexes.customFn)
    m[1].should.equal('getWeather')
    m[2].should.equal('today,<cap>')
    m.index.should.equal(15)
  })

  it('wordnet should match “I ~like ~sport” expressions', function() {
    // const m = regexes.wordnet.match('I ~like ~sport')
    const m = 'I ~like ~sport'.match(regexes.wordnet)
    m.should.deepEqual(['~like', '~sport'])
  })

  it('state should match “{keep} some {state}” expressions', function() {
    // const m = regexes.state.match('{keep} some {state}')
    const m = '{keep} some {state}'.match(regexes.state)
    m.should.deepEqual(['{keep}', '{state}'])
  })

})
