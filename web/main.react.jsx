class Monitor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {status:{}, clients:{}, connected:false};
    }

    render() {
        window.state = this.state;

        var clients_list = Object.keys(this.state.clients).sort((v1,v2) => {return this.state.clients[v1].order - this.state.clients[v2].order;});

        var contents = [];

        for (var i = 0; i < clients_list.length; i++){
            var name = this.state.clients[clients_list[i]].name;
            // FIXME: hackish way to get object by name, what is better?..
            var Client = window[this.state.clients[clients_list[i]].template];

            if (Client)
                contents.push(<Client status={this.state.status[name]} client={this.state.clients[name]} key={name}/>);
        }

        return (
            <div className={this.state.connected ? null : "disabled-controls"}>
              {contents}
            </div>
        );
    }

    componentDidMount() {
        this.requestState();
    }

    requestState(){
        $.ajax({
            url: this.props.root + "monitor/status",
            dataType : "json",
            timeout : 10000,
            context: this,

            success: function(json){
                this.setState({status: json.status, clients:json.clients, connected:true});
            },

            error: function(){
                this.setState({connected:false});
            },

            complete: function(xhr, status) {
                clearTimeout(this.timer);
                this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }
}

Monitor.defaultProps = {refresh:"2000"};

ReactDOM.render(
    <Monitor title="RTS2 Monitor" root={window.location.pathname}/>,
    document.getElementById('contents-wide')
);
