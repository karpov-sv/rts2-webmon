class Label extends React.Component {
    render() {
        return (<span className={"label label-" + this.props.className} style={this.props.style} title={this.props.title}>{this.props.children}</span>);
    }
}

Label.defaultProps = {style: {margin: "0.2em"}};

class Link extends React.Component {
    render() {
        return (
            <a href={this.props.url} title={this.props.title} style={{padding: "0.2em"}}>
              <span className="glyphicon glyphicon-link"></span>
              {this.props.name}
            </a>
        );
    }
}

function unixtime(unix, age=true) {
    if (unix) {
        var t = moment.unix(unix);
        var dt = moment.duration(t.diff(moment()));

        t = t.format('YYYY-MM-DD HH:mm:ss ZZ');

        if (age)
            return t + ' (' + dt.format() + ')';
        else
            return t;
    } else
        return "---";
}

class UnixTime extends React.Component {
    render() {
        var unix = this.props.time;

        return unixtime(unix, this.props.age);
    }

    componentDidMount() {
        if (this.props.refresh)
            this.interval = setInterval(() => this.setState({ time: Date.now() }), this.props.refresh);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }
}

UnixTime.defaultProps = {refresh:"500", age:true};

class ImageRefresh extends React.Component {
    constructor(props) {
        super(props);
        this.state = {src: props.src, rsrc: props.src};
        this.interval = null;
    }

    render() {
        return <img className="img img-responsive center-block" src={this.state.rsrc} onLoad={this.run.bind(this)} onError={this.run.bind(this)}/>;
    }

    updateSrc() {
        if(this.state.src.indexOf("?") > 0)
            this.setState({rsrc: this.state.src + '&rnd=' + Math.random()});
        else
            this.setState({rsrc: this.state.src + '?rnd=' + Math.random()});
    }

    run() {
        clearInterval(this.interval);
        if (this.props.refresh)
            this.interval = setInterval(() => this.updateSrc(), this.props.refresh);
    }

    componentDidMount() {
        this.run();
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }
}

ImageRefresh.defaultProps = {refresh:"10000"};

function now() {
    return moment().unix();
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key) && !key.startsWith('jQuery'))
            return false;
    }
    return true;
}

function deepCopy(obj) {
    if(isArray(obj))
        return obj.slice(0);

    return jQuery.extend(true, {}, obj);
}

function toSexa(value, hms=false, plus=false, sep=":", lastdigits=2) {
    var sign = Math.sign(value);

    value = Math.abs(value);

    var v1 = Math.floor(value);
    var v2 = Math.floor(value*60 - v1*60);
    var v3 = value*3600 - v1*3600 - v2*60;

    var result = (sign < 0) ? "-" : (plus ? "+" : "");

    if (hms)
        result += sprintf("%02dh%02dm%0"+(lastdigits+3)+"."+lastdigits+"f", v1, v2, v3);
    else
        result += sprintf("%02d%s%02d%s%0"+(lastdigits+3)+"."+lastdigits+"f", v1, sep, v2, sep, v3);

    return result;
}
