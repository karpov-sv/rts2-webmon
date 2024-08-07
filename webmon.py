#!/usr/bin/env python3
from twisted.internet import reactor, task
from twisted.protocols.basic import LineReceiver
from twisted.web.server import Site, GzipEncoderFactory
from twisted.web.resource import Resource, EncodingResourceWrapper
from twisted.web.static import File
from twisted.web.client import Agent, readBody
from twisted.web.http_headers import Headers
from twisted.internet.endpoints import TCP4ServerEndpoint
from twisted.web.proxy import ReverseProxyResource
from twisted.python.compat import urlquote

from twistedauth import wrap_with_auth as Auth

import os, sys, posixpath, datetime, base64, re, glob
import urllib.parse
import json
import numpy as np
from collections import OrderedDict

from io import StringIO
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.figure import Figure
from matplotlib.dates import DateFormatter
from matplotlib.ticker import ScalarFormatter, LogLocator, LinearLocator, MaxNLocator, NullLocator

def catch(func):
    '''Decorator to catch errors inside functions and print tracebacks'''
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except:
            import traceback
            traceback.print_exc()

    return wrapper

def serve_json(request, **kwargs):
    request.responseHeaders.setRawHeaders("Content-Type", ['application/json'])
    return json.dumps(kwargs).encode()

def make_plot(file, obj, client_name, plot_name, size=800):
    plot = obj['clients'][client_name]['plots'][plot_name]
    values = obj['values'][client_name]

    has_data = False

    fig = Figure(facecolor='white', dpi=72, figsize=(plot['width']/72, plot['height']/72), tight_layout=True)
    ax = fig.add_subplot(111)

    for _ in plot['values'][1:]:
        # Check whether we have at least one data point to plot
        if np.any(np.array(values[_]) != None):
            has_data = True
            ax.plot(values[plot['values'][0]], values[_], '-', label=_)

    if plot['values'][0] == 'time' and len(values[plot['values'][0]]) > 1 and has_data:
        ax.xaxis.set_major_formatter(DateFormatter('%H:%M:%S'))
        fig.autofmt_xdate()

    if plot['xlabel']:
        ax.set_xlabel(plot['xlabel'])
    else:
        ax.set_xlabel(plot['values'][0])

    if plot['ylabel']:
        ax.set_ylabel(plot['ylabel'])
    elif len(plot['values']) == 1:
        ax.set_ylabel(plot['values'][1])

    if has_data:
        if plot['xscale'] != 'linear':
            ax.set_xscale(plot['xscale'], nonposx='clip')

        if plot['yscale'] != 'linear':
            ax.set_yscale(plot['yscale'], nonposy='clip')

            if plot['yscale'] == 'log':
                # Try to fix the ticks if the data span is too small
                axis = ax.get_yaxis()
                if np.ptp(np.log10(axis.get_data_interval())) < 1:
                    axis.set_major_locator(MaxNLocator())
                    axis.set_minor_locator(NullLocator())

        if len(plot['values']) > 4:
            ax.legend(frameon=True, loc=2, framealpha=0.99)
        elif len(plot['values']) > 2:
            ax.legend(frameon=False)

    if plot['name']:
        ax.set_title(plot['name'])
    ax.margins(0.01, 0.1)

    # FIXME: make it configurable
    ax.grid(True)

    # Return the image
    canvas = FigureCanvas(fig)
    canvas.print_png(file, bbox_inches='tight')

class WebMonitor(Resource):
    isLeaf = True

    @catch
    def __init__(self, object=None):
        self.object = object

        self._REST_agent = Agent(reactor)

    @catch
    def REST_request(self, baseurl='', path='/', user=None, password=None, repeat=None, name=None):
        '''Initiate (repeating) '''
        headers = Headers({
            'User-Agent': ['Twisted Web Client'],
            'Authorization': [
                "Basic " + base64.encodebytes(
                    ('%s:%s' % (user, password)).encode()).decode().strip()
            ]
        })

        url = urllib.parse.urljoin(baseurl,  path)
        defer = self._REST_agent.request(b'GET', url.encode(), headers, None)

        defer.addCallback(self._REST_callback, baseurl=baseurl, path=path, name=name)
        defer.addErrback(self._REST_errback, baseurl=baseurl, path=path, name=name)

        if repeat is not None:
            defer.addBoth(self._REST_repeat, baseurl=baseurl, path=path, user=user, password=password, repeat=repeat, name=name)

        return defer

    @catch
    def _REST_callback(self, response, baseurl=None, path=None, name=None):
        defer = readBody(response)
        defer.addCallback(self.REST_process, baseurl=baseurl, path=path, name=name)

        return defer

    @catch
    def _REST_errback(self, response, baseurl=None, path=None, name=None):
        if name in self.object['clients']:
            self.object['clients'][name]['connected'] = False

    @catch
    def _REST_repeat(self, response, baseurl=None, path=None, user=None, password=None, repeat=None, name=None):
        return task.deferLater(reactor, repeat, self.REST_request, baseurl=baseurl, path=path, user=user, password=password, repeat=repeat, name=name)

    @catch
    def REST_process(self, body, baseurl=None, path=None, name=None):
        '''Processing of reply from REST API endpoint'''
        if path == '/api/getall' and name and name in self.object['clients']:
            status = json.loads(body, object_pairs_hook=OrderedDict)
            # self.object['clients'][name]['status'] = status
            self.object['status'][name] = status
            self.object['clients'][name]['connected'] = True
            self.object['clients'][name]['last_status'] = (datetime.datetime.utcnow() - datetime.datetime(1970, 1, 1)).total_seconds()

            # TODO: Store to database before modifying the status

            for _ in self.object['clients'][name]['devices']:
                if _ not in self.object['status'][name]:
                    self.object['status'][name][_] = {'connected':False}
                    self.object['status'][name][_]['last_status'] = self.object['clients'][name]['devices_last_status'][_]
                else:
                    self.object['status'][name][_]['connected'] = True
                    self.object['clients'][name]['devices_last_status'][_] = (datetime.datetime.utcnow() - datetime.datetime(1970, 1, 1)).total_seconds()
                    self.object['status'][name][_]['last_status'] = self.object['clients'][name]['devices_last_status'][_]

            for _ in self.object['status'][name]:
                if type(self.object['status'][name][_]) == dict:
                    if _ in self.object['clients'][name]['devices']:
                        self.object['status'][name][_]['order'] = self.object['clients'][name]['devices'].index(_)
                    else:
                        self.object['status'][name][_]['order'] = 100

            # We have to keep the history of values for some variables for plots
            if name in self.object['values']:
                for value_name in self.object['values'][name]:
                    if value_name == 'time':
                        value = datetime.datetime.utcnow()
                    else:
                        s = value_name.split('.')
                        value = status.get(s[0], {}).get('d', {}).get(s[1], None)

                        # Now we should try to convert the value to numerical form, if possible
                        try:
                            value = float(value)
                        except:
                            pass

                    self.object['values'][name][value_name].append(value)
                    # Keep the maximal length of data arrays limited
                    # TODO: make it configurable, probably for every plot
                    if len(self.object['values'][name][value_name]) > 1000:
                        self.object['values'][name][value_name] = self.object['values'][name][value_name][100:]

    @catch
    def render_GET(self, request):
        '''Processing of HTTP GET query from frontend'''
        q = urllib.parse.urlparse(request.uri)
        args = urllib.parse.parse_qs(q.query.decode())
        path = q.path.decode()
        qs = path.split('/')

        if path == '/monitor/status':
            return serve_json(request,
                              clients = self.object['clients'],
                              status = self.object['status'],
                              auth = request.getSession().uid in self.object['sessions'],
                              username = self.object['sessions'].get(request.getSession().uid))

        elif path == '/monitor/auth':
            result = False

            if 'username' in args and 'password' in args and args['username'][0] == self.object['api_username'] and args['password'][0] == self.object['api_password']:
                print("Authorized session", request.getSession().uid)
                self.object['sessions'][request.getSession().uid] = args.get('username')
                request.getSession().sessionTimeout = 24*3600*365
                result = True
                # Crude hack to keep the session cookie longer
                cookiename = "_".join(['TWISTED_SESSION'] + request.sitepath)
                request.addCookie(cookiename, request.getSession().uid, path='/', max_age=str(365*3600*24))
            else:
                print("De-authorized session", request.getSession().uid)
                self.object['sessions'].pop(request.getSession().uid, None)
                request.getSession().expire()

            return serve_json(request, auth = result, username=self.object['sessions'].get(request.getSession().uid))

        # /monitor/plots/{client}/{name}
        elif qs[1] == 'monitor' and qs[2] == 'plot' and len(qs) > 4:
            s = StringIO()
            make_plot(s, self.object, qs[3], qs[4])
            request.responseHeaders.setRawHeaders("Content-Type", ['image/png'])
            request.responseHeaders.setRawHeaders("Content-Length", [s.len])
            request.responseHeaders.setRawHeaders("Cache-Control", ['no-store, no-cache, must-revalidate, max-age=0'])
            return s.getvalue().encode()

        else:
            return q.path;
        # return serve_json(request, clients=self.object['clients'])

class ServeFiles(Resource):
    isLeaf = True

    @catch
    def __init__(self, files=None, glob='*', type='text/plain'):
        self.files = files
        self.glob = glob
        self.type = type

    @catch
    def render_GET(self, request):
        result = "";

        if self.files is None:
            files = glob.glob(self.glob)
        else:
            files = self.files
        for filename in files:
            result += open(filename).read()

        request.responseHeaders.setRawHeaders("Content-Type", [self.type])
        return result.encode()

class ReverseProxyResourceAuth(ReverseProxyResource):
    def __init__(self, host, port, path, reactor=reactor, username=None, password=None, base=None, object=None):
        self._username = username
        self._password = password
        self._base = base
        self.object = object

        return ReverseProxyResource.__init__(self, host, port, path, reactor)

    def render(self, request):
        if request.getSession().uid not in obj['sessions']:
            return "Not authorized"

        if self._username:
            request.requestHeaders.setRawHeaders(
                'Authorization', [
                    "Basic " + base64.encodebytes(('%s:%s' % (self._username, self._password)).encode()).decode().strip()
                ]
            )

        if self._base or request.getHeader(b'X-Request-Base'):
            base = ""

            if request.getHeader('X-Request-Base'):
                base += request.getHeader('X-Request-Base')

            if self._base:
                base += self._base

            request.requestHeaders.setRawHeaders('X-Request-Base', [base])

        return ReverseProxyResource.render(self, request)

    def getChild(self, path, request):
        fullpath = self.path + b'/' + urlquote(path, safe=b"").encode()
        # print(self.path.encode() + b'/' +urlquote(path, safe=b"").encode())
        # print(fullpath)
        child = ReverseProxyResourceAuth(
            self.host,
            self.port,
            fullpath,
            reactor=self.reactor,
            username=self._username,
            password=self._password,
            base=self._base
        )
        return EncodingResourceWrapper(child, [GzipEncoderFactory()])

def loadINI(filename, obj):
    # We use ConfigObj library, docs: http://configobj.readthedocs.io/en/latest/index.html
    from configobj import ConfigObj,Section # apt-get install python-configobj
    from validate import Validator

    # Schema to validate and transform the values from config file
    schema = ConfigObj(StringIO('''
    http_port = integer(min=0,max=65535,default=%d)
    name = string(default=%s)
    db_host = string(default=%s)
    db_status_interval = float(min=0, max=3600, default=%g)
    username = string(default='')
    password = string(default='')
    api_username = string(default='')
    api_password = string(default='')

    [__many__]
    enabled = boolean(default=True)
    baseurl = string(default=localhost)
    username = string(default='')
    password = string(default='')
    description = string(default=None)
    template = string(default=DefaultClient)
    update_interval = float(min=0, max=3600, default=1)
    devices = list(default=,)
    webcam = string(default='')
    order = integer(default=100)

    [[links]]
    [[[__many__]]]
    name = string(default=None)
    url = string(default=None)

    [[plots]]
    [[[__many__]]]
    name = string(default=None)
    values = list(default=,)
    xlabel = string(default=None)
    ylabel = string(default=None)
    width = integer(min=0,max=2048,default=800)
    height = integer(min=0,max=2048,default=300)
    xscale = string(default=linear)
    yscale = string(default=linear)
    ''' % (obj['http_port'], obj['name'], obj['db_host'], obj['db_status_interval'])), list_values=False)

    confname = '%s.ini' % posixpath.splitext(__file__)[0]
    conf = ConfigObj(confname, configspec=schema)
    if len(conf):
        result = conf.validate(Validator())
        if result != True:
            print("Config file failed validation: %s" % confname)
            print(result)

            raise RuntimeError

        for sname in conf:
            section = conf[sname]

            # Skip leafs and branches with enabled=False
            if type(section) != Section or not section['enabled']:
                continue

            client = section.dict()
            client['name'] = sname

            obj['values'][sname] = {}

            if 'plots' in section:
                values = []

                # Parse parameters of plots
                for plot in section['plots']:
                    client['plots'][plot] = section['plots'][plot]

                    values += section['plots'][plot]['values']

                obj['values'][sname] = {_:[] for _ in set(values)} # Unique values

            obj['clients'][sname] = client

        for key in ['http_port', 'name', 'db_host', 'db_status_interval', 'username', 'password', 'api_username', 'api_password']:
            obj[key] = conf.get(key)

    # print obj
    # sys.exit(1)

    return True

if __name__ == '__main__':
    from optparse import OptionParser

    obj = {'clients':{}, 'values':{}, 'http_port':8888, 'db_host':None, 'db_status_interval':60.0, 'name':'webmon', 'db':None, 'status':{}}

    # First read client config from INI file
    loadINI('%s.ini' % posixpath.splitext(__file__)[0], obj)

    parser = OptionParser(usage="usage: %prog [options] name1=baseurl1 name2=baseurl2 ...")
    parser.add_option('-d', '--debug', help='Debug output', action='store_true', dest='debug', default=False)
    parser.add_option('-p', '--http-port', help='HTTP server port', action='store', dest='http_port', type='int', default=obj['http_port'])

    (options,args) = parser.parse_args()

    # Next parse command line positional args as name=host:port tokens
    for arg in args:
        m = re.match('(([a-zA-Z0-9-_]+)=)?(.*)', arg)
        if m:
            name,baseurl = m.group(2,3)

            if name in obj['clients']:
                obj['clients'][name]['baseurl'] = baseurl
            else:
                obj['clients'][name] = {'baseurl':baseurl, 'name':name, 'description':name, 'template':'default.html', 'update_interval':5.0, 'plots':None}

    if options.debug:
        from twisted.python import log
        log.startLogging(sys.stdout)

    # Serve files from web
    webmon = WebMonitor(object=obj)

    root = File(b"web")
    root.putChild(b"", File('web/main.html'))
    root.putChild(b"dark", File('web/main.dark.html'))
    root.putChild(b"monitor", EncodingResourceWrapper(webmon, [GzipEncoderFactory()]))

    # root.putChild(b"all.jsx", ServeFiles('web/*.jsx'))
    root.putChild(b"all.jsx", ServeFiles(files=[
        'web/cmdline.jsx',
        'web/modal-camera.react.jsx',
        'web/modal-device.react.jsx',
        'web/modal-image.react.jsx',
        'web/modal-queue.react.jsx',
        'web/modal.react.jsx',
        'web/react-fast-compare.jsx',
        'web/utils.react.jsx',
        'web/default.react.jsx',
        'web/fram.react.jsx',
        'web/main.react.jsx',
    ]))

    if obj['username']:
        print('Username:', obj['username'])
        print('Password:', obj['password'])
        site = Site(Auth(root, {obj['username']:obj['password']}))

        # Do not expose the username and password
        obj['username'] = '*'
        obj['password'] = '*'
    else:
        site = Site(root)

    for name,c in list(obj['clients'].items()):
        print("Adding periodic polling of status from", c['name'], "at",  c['baseurl'], "every", c['update_interval'], "s")
        webmon.REST_request(
            c['baseurl'],
            '/api/getall',
            user=c['username'],
            password=c['password'],
            repeat=c['update_interval'],
            name=c['name']
        )

        if obj['api_username']:
            # Reverse proxy for HTTPD web interface
            url = urllib.parse.urlparse(c['baseurl'])
            root.putChild(
                c['name'].encode(),
                ReverseProxyResourceAuth(
                    url.hostname,
                    url.port,
                    url.path.encode(),
                    username=c['username'],
                    password=c['password'],
                    base='/'+c['name'],
                    object=obj
                )
            )
            print("Direct access to RTS2 HTTPD exposed under", "/"+c['name']+"/")

        # Do not expose the username and password
        c['username'] = '*'
        c['password'] = '*'

        c['connected'] = False
        c['last_status'] = 0
        c['devices_last_status'] = {_:0 for _ in c['devices']}

    obj['sessions'] = {}

    print("Listening for incoming HTTP connections on port %d" % options.http_port)
    TCP4ServerEndpoint(reactor, options.http_port).listen(site)

    reactor.run()
