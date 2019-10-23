import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import 'mocha'
import Router, { HTTPRouterOptions } from '../src/httpRouter'
import Certificates from '../src/certificates'
import LetsEncryptUsingAcmeClient from '../src/letsEnryptUsingAcmeClient'

chai.use(chaiAsPromised)

export class RouterTests extends Router {
  constructor(options: HTTPRouterOptions) {
    super(options)
  }

  public runRegistrationTests = async () => {
    // this.log = null

    // this.startServers();
    describe('Route registration', () => {
      it(`should register a route`, () => {
        expect(this.routing).to.be.an('object')

        this.forward('test.local.com', 'http://localhost:9001')

        expect(this.routing).to.have.property('test.local.com')

        const route = this.resolve('test.local.com')

        expect(route).to.be.an('object')

        const hostEntry = this.routing['test.local.com']
        expect(hostEntry).to.be.an('array')
        expect(hostEntry).to.have.lengthOf(1)
        const hostRoute = hostEntry[0]
        expect(hostRoute).to.have.property('path')
        expect(hostRoute.path).to.be.equal('/')
        expect(hostRoute.targets).to.be.an('array')
        expect(hostRoute.targets).to.have.lengthOf(1)
        expect(hostRoute.targets[0].href).to.be.equal('http://localhost:9001/')

        this.unforward('test.local.com', 'http://localhost:9001')

        expect(this.resolve('test.local.com')).to.be.null
      })

      it('should register multiple routes', () => {
        let index = 0

        for (index = 0; index < 10; ++index) {
          this.forward(`test${index}.local.com`, `http://localhost:900${index}`)

          expect(this.routing).to.have.property(`test${index}.local.com`)
        }

        for (index = 0; index < 10; ++index) {

          const route = this.resolve(`test${index}.local.com`)

          expect(route).to.be.an('object')

          const hostEntry = this.routing[`test${index}.local.com`]
          expect(hostEntry).to.be.an('array')
          expect(hostEntry).to.have.lengthOf(1)
          const hostRoute = hostEntry[0]
          expect(hostRoute).to.have.property('path')
          expect(hostRoute.path).to.be.equal('/')
          expect(hostRoute.targets).to.be.an('array')
          expect(hostRoute.targets).to.have.lengthOf(1)
          expect(hostRoute.targets[0].hostname).to.be.equal('localhost')
          expect(hostRoute.targets[0].host).to.be.equal(`localhost:900${index}`)
          expect(hostRoute.targets[0].href).to.be.equal(`http://localhost:900${index}/`)
        }

        for (index = 0; index < 10; ++index) {
          this.unforward(`test${index}.local.com`, `http://localhost:900${index}`)

          expect(this.resolve(`test${index}.local.com`)).to.be.null
        }
      })

      it('should register multiple paths', () => {

        const paths = ['test1', 'test2', 'test3', 'test4']
        const routes = ['testing1', 'testing2', 'testing3', 'testing4']

        paths.forEach((path, index) => {
          this.forward(`test.local.com/${path}`, `http://localhost:9001/${routes[index]}`)
          expect(this.routing).to.have.property('test.local.com')
          expect(this.resolve(`test.local.com`, `/${path}`)).to.be.an('object')
        })

        const hostEntry = this.routing['test.local.com']

        expect(hostEntry).to.be.an('array')
        expect(hostEntry).to.have.lengthOf(4)

        paths.forEach((path, index) => {

          const hostRoute = hostEntry[index]

          expect(hostRoute).to.have.property('path')
          expect(hostRoute.path).to.be.equal(`/${path}`)
          expect(hostRoute.targets).to.be.an('array')
          expect(hostRoute.targets).to.have.lengthOf(1)
          expect(hostRoute.targets[0].hostname).to.be.equal('localhost')
          expect(hostRoute.targets[0].host).to.be.equal('localhost:9001')
          expect(hostRoute.targets[0].href).to.be.equal(`http://localhost:9001/${routes[index]}`)
        })

        paths.forEach((path, index) => {
          this.unforward(`test.local.com/${path}`, `http://localhost:9001/${routes[index]}`)

          expect(this.resolve('test.local.com', `/${path}`)).to.be.null
        })
      })

      it('should register several pathnames in a route', () => {
        const paths = ['test.local1.com', 'test.local1.com/test/abc', 'test.local1.com/abc', 'test.local1.com/123']
        const routes = ['server1.remote.com', 'server2.remote.com', 'server3.remote.com', 'server4.remote.com']

        paths.forEach((path, index) => {
          this.forward(path, routes[index])
        })

        expect(this.routing).to.have.property('test.local1.com')
        const host = this.routing['test.local1.com']
        expect(host).to.be.an('array')
        expect(host).to.have.lengthOf(paths.length)
        const route = host[0]
        expect(route).to.have.property('path')
        expect(route.path).to.be.equal('/test/abc')
        expect(route.targets).to.be.an('array')
        expect(route.targets).to.have.lengthOf(1)
        expect(route.targets[0].href).to.be.equal('http://server2.remote.com/')
        expect(host[0].path.length).to.be.least(host[1].path.length)
        expect(host[1].path.length).to.be.least(host[2].path.length)
        expect(host[2].path.length).to.be.least(host[3].path.length)

        paths.forEach((path, index) => {
          this.unforward(path, routes[index])
        })
      })

      it('should resolve domains as case insensitive', () => {
        this.forward('Test.loCal.com', 'http://LocalHost:9001')

        expect(this.routing).to.have.property('test.local.com')

        const route = this.resolve('tesT.locAl.com')

        expect(route).to.be.an('object')
        expect(route.targets).to.be.an('array')
        expect(route.targets).to.have.lengthOf(1)
        expect(route.targets[0].hostname).to.be.equal('localhost')
        expect(route.targets[0].host).to.be.equal('localhost:9001')
        expect(route.targets[0].href).to.be.equal('http://localhost:9001/')

        this.unforward('test.local.com', 'http://localhost:9001')
        expect(this.resolve('tesT.locAl.com')).to.be.null
        expect(this.resolve('test.local.com')).to.be.null
      })

      it('should handle unregistering an unregistered host gracefully', () => {
        this.unforward('unknown.local.com')
      })

      it('should have and empty routing table', () => {
        expect(Object.keys(this.routing).length).to.be.equal(0)
      })

      it('should resolve partial paths', () => {
        const paths = ['test.local2.com', 'test.local2.com/test/abc', 'test.local2.com/abc', 'test.local2.com/123']
        const routes = ['server1.remote.com', 'server2.remote.com', 'server3.remote.com', 'server4.remote.com']

        paths.forEach((path, index) => {
          this.forward(path, routes[index])
        })

        expect(this.routing).to.have.property('test.local2.com')

        const target = this.resolve('test.local2.com', '/abc/def/123')

        expect(target.path).to.equal('/abc')
        expect(target.targets).has.lengthOf(1)
        expect(target.targets[0].href).to.be.equal('http://server3.remote.com/')

        paths.forEach((path, index) => {
          this.unforward(path, routes[index])
        })
      })
      it('should resolve unregistered route to null', () => {
        const paths = ['test.local3.com/def', 'test.local3.com/test/abc', 'test.local3.com/abc', 'test.local3.com/123']
        const routes = ['server1.remote.com', 'server2.remote.com', 'server3.remote.com', 'server4.remote.com']

        paths.forEach((path, index) => {
          this.forward(path, routes[index])
        })

        expect(this.resolve('test.local1.com')).to.be.null
        expect(this.resolve('test.local3.com')).to.be.null

        paths.forEach((path, index) => {
          this.unforward(path, routes[index])
        })
      })

      it('should get route if available', () => {
        const paths = ['test.local4.com', 'test.local4.com/test/abc', 'test.local4.com/abc', 'test.local4.com/123',
          'test.local5.com/abc']
        const routes = ['server1.remote.com', 'server2.remote.com', 'server3.remote.com', 'server4.remote.com', 'server5.remote.com']

        paths.forEach((path, index) => {
          this.forward(path, routes[index])
        })

        expect(this.resolve('test.local4.com', '/test/def/123').path).to.be.equal('/')
        expect(this.resolve('test.local5.com', '/test')).to.be.null
        expect(this.resolve('test.local5.com', '/abcs')).to.be.null
        expect(this.resolve('test.local4.com', '/abc/123').path).to.be.equal('/abc')
        expect(this.getTarget('test.local4.com', { url: '/abc/123/test' } as any).href).to.be.equal('http://server3.remote.com/')
        paths.forEach((path, index) => {
          this.unforward(path, routes[index])
        })
      })

      it('should get a target with a path', () => {
        const paths = ['test.local4.com', 'test.local4.com/test/abc', 'test.local4.com/test', 'test.local4.com/123',
          'test.local5.com/abc']
        const routes = ['server1.remote.com', 'server2.remote.com/abc/123', 'server3.remote.com/321/cba', 'server4.remote.com', 'server5.remote.com']

        paths.forEach((path, index) => {
          this.forward(path, routes[index])
        })

        expect(this.resolve('test.local4.com', '/def/123').path).to.be.equal('/')
        expect(this.getTarget('test.local4.com', { url: '/test/123/456' } as any).href).to.be.equal('http://server3.remote.com/321/cba')
        paths.forEach((path, index) => {
          this.unforward(path, routes[index])
        })
      })

      it('should have and empty routing table', () => {
        expect(Object.keys(this.routing).length).to.be.equal(0)
      })
    })
  }
}