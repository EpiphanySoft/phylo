/* global require, describe, it, afterEach */

const File = require('../../File')

const { expect } = require('assertly')

require('../util')

describe('File Save', function () {
  let file

  beforeEach(function () {
    file = File.from(__filename).resolve('..', 'temp.txt')
  })

  afterEach(function () {
    if (file) {
      file.remove()

      file = null
    }
  })

  it('should sync save file', function () {
    expect(file.exists()).to.be(false)

    file.save('foo')

    // need to update stat cache
    file.restat()

    expect(file.exists()).to.be(true)
    expect(file.load()).to.be('foo')

    file.save('bar')

    expect(file.load()).to.be('bar')
  })

  it('should async save file', function () {
    expect(file.exists()).to.be(false)

    return file
      .asyncSave('foo')
      // check if file was created and has proper content
      .then(() => {
        // need to update stat cache
        file.restat()

        expect(file.exists()).to.be(true)
        expect(file.load()).to.be('foo')

        return file
      })
      .then(() => file.asyncSave('bar'))
      // check if file has proper content
      .then(() => expect(file.load()).to.be('bar'))
  })
})
