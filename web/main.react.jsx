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

            if (Client) {
                contents.push(<Client status={this.state.status[name]} client={this.state.clients[name]} key={name}/>);
            }
        }

        return (
            <div className={this.state.connected ? null : "disabled-controls"}>
              {contents}
              <div className="pull-right">
                <AuthModal/>
              </div>
            </div>
        );
    }

    componentDidMount() {
        this.requestState();
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(!equal(this.state, nextState))
            return true;

        return false;
    }

    requestState(){
        $.ajax({
            url: this.props.root + "monitor/status",
            dataType : "json",
            timeout : 10000,
            context: this,

            success: function(json){
                this.setState({status: json.status, clients:json.clients, connected:true});
                this.props.dispatch(globalSetAuth(json.auth));
                this.props.dispatch(globalSetUsername(json.username));
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

Monitor.defaultProps = {refresh:"5000"};
Monitor = ReactRedux.connect(mapStateToProps)(Monitor);

// Global Redux store

const initialState = {auth: false, username: '', root: window.location.pathname};

const globalSetAuth = value => ({type: 'SET_AUTH', value: value});
const globalSetUsername = value => ({type: 'SET_USERNAME', value: value});

function globalReducer(state=initialState, action)
{
    switch(action.type) {
    case 'SET_AUTH':
        return Object.assign({}, state, {auth: action.value});
    case 'SET_USERNAME':
        return Object.assign({}, state, {username: action.value});
    default:
        return state;
    };
}

function mapStateToProps(state, ownProps)
{
    return {auth: state.auth, username: state.username, root: state.root};
}

const store = Redux.createStore(globalReducer);

ReactDOM.render(
    <ReactRedux.Provider store={store}>
      <Monitor title="RTS2 Monitor"/>
    </ReactRedux.Provider>,
    document.getElementById('contents-wide')
);
