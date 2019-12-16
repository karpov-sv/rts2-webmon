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
              {this.props.view == 'full'
               ? contents
               :
              <Row>
                {contents}
              </Row>
              }
              <div style={{marginBottom: "0.5em"}}>
                <span className="pull-left">
                  <ViewSelector view={this.props.view} onChange={(_)=>this.props.dispatch(globalSetView(_))}/>
                </span>
                <span className="pull-right">
                  <AuthModal/>
                </span>
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

        if(this.props.auth != nextProps.auth)
            return true;

        if(this.props.view != nextProps.view)
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

class ViewSelector extends React.Component {
    render() {
        return <span style={{marginRight:'0.5em'}}>{'View: '}
                 {this.props.view == 'full'
                  ? <a onClick={()=>this.props.onChange('compact')}>{'Full'}</a>
                  : <a onClick={()=>this.props.onChange('full')}>{'Compact'}</a>}
               </span>;
    }
}

// Global Redux store

const initialState = {auth: false, username: '', root: window.location.pathname, view: getCookie('view', 'full')};

const globalSetAuth = value => ({type: 'SET_AUTH', value: value});
const globalSetUsername = value => ({type: 'SET_USERNAME', value: value});
const globalSetView = value => ({type: 'SET_VIEW', value: value});

function globalReducer(state=initialState, action)
{
    switch(action.type) {
    case 'SET_AUTH':
        return Object.assign({}, state, {auth: action.value});
    case 'SET_USERNAME':
        return Object.assign({}, state, {username: action.value});
    case 'SET_VIEW':
        setCookie('view', action.value);
        return Object.assign({}, state, {view: action.value});
    default:
        return state;
    };
}

function mapStateToProps(state, ownProps)
{
    return {auth: state.auth, username: state.username, root: state.root, view: state.view};
}

const store = Redux.createStore(globalReducer);

ReactDOM.render(
    <ReactRedux.Provider store={store}>
      <Monitor title="RTS2 Monitor"/>
    </ReactRedux.Provider>,
    document.getElementById('contents-wide')
);
