function parseCommand(command, name=null) {
    var m;
    var cmd;
    var data;

    if(name && name.length &&
       (!command.includes('.') || (command.includes('.') && command.includes('=') && command.indexOf('.') > command.indexOf('='))))
        command = name + '.' + command;

    if(m = /^\s*(\w+)\.(\w+)\s*\+\=\s*(\w+)\s*$/.exec(command)) {
        cmd = 'inc';
        data = {d: m[1], n: m[2], v: m[3]};

        return [cmd,data];
    } else if(m = /^\s*(\w+)\.(\w+)\s*\-\=\s*(\w+)\s*$/.exec(command)) {
        cmd = 'dec';
        data = {d: m[1], n: m[2], v: m[3]};

        return [cmd,data];
    } else if(m = /^\s*(\w+)\.(\w+)\s*\=\s*(.*?)\s*$/.exec(command)) {
        cmd = 'set';
        data = {d: m[1], n: m[2], v: m[3]};

        return [cmd,data];
    } else if(m = /^\s*(\w+)\.(.+)\s*$/.exec(command)) {
        cmd = 'cmd';
        data = {d: m[1], c: m[2]};

        return [cmd,data];
    } else {
        return null;
    }
}

class CmdLine extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {disabled: false, message: null, ret: 0, command: ""};
        this.history = [];
        this.pos = 0;
    }

    handleChange(event) {
        this.setState({[event.target.id]: event.target.value});
    }

    handleKeyPress(event) {
        if(event.key == 'ArrowUp'){
            if(this.pos < this.history.length)
                this.setState({command: this.history[this.pos]});
            if(this.pos < this.history.length - 1)
                this.pos += 1;
        }

        if(event.key == 'ArrowDown'){
            if(this.pos > 0){
                this.setState({command: this.history[this.pos - 1]});
                this.pos -= 1;
            } else
                this.setState({command: ''});
        }
    }

    handleSubmit(event) {
        this.setState({disabled: true});

        if(this.state.command) {
            this.sendCommand(this.state.command);
            this.history.unshift(this.state.command);
        }

        this.pos = 0;
        this.setState({command: ""});

        event.preventDefault();
    }

    sendCommand(command) {
        var cmd;
        var data;
        var m = parseCommand(command, this.props.name);

        if(m)
            [cmd,data] = m;
        else {
            this.setState({message: "Can't parse command: " + command});
            return;
        }

        this.setState({message: "", disabled: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                this.setState({message: json.ret + ' ' + command, ret: json.ret});
                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.setState({message: "API request error", ret: -1});
                if(this.props.onError)
                    this.props.onError();
            },

            complete: function(xhr, status) {
                this.setState({disabled: false});
                if(this.props.onComplete)
                    this.props.onComplete();
            }
        });
    }

    render() {
        var placeholder = this.props.name ? 'Command or Device.Command' : 'Device.Command';
        return (
            <>
              <Form onSubmit={evt => this.handleSubmit(evt)}>
                <InputGroup>
                  <InputGroup.Addon>Cmd:</InputGroup.Addon>
                  <FormControl id="command" type="text" value={this.state.command} placeholder={placeholder} autoFocus onChange={evt => this.handleChange(evt)} onKeyDown={evt => this.handleKeyPress(evt)} autoComplete='off'/>
                  <InputGroup.Addon><span className={this.state.ret ? "text-danger" : "text-success"}>{this.state.message}</span></InputGroup.Addon>
                  <InputGroup.Button><Button onClick={evt => this.handleSubmit(evt)}>Send</Button></InputGroup.Button>
                </InputGroup>
              </Form>
            </>
        );
    }
}

CmdLine = ReactRedux.connect(mapStateToProps)(CmdLine);
