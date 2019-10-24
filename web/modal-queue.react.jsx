// Queue variables
class QueueModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, targets: [], htargets: [], error: null, target_selected: null, message: null, queue: null, inprogress: false, vars: null, time1: null, time2: null};
    }

    requestTargets() {
        if(!this.props.auth)
            return;

        if (this.state.targets.length > 0)
            return;

        this.message("Loading target information...", "text-default");

        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/tlist",
            dataType : "json",
            timeout : 10000,
            context: this,

            success: function(json){
                this.setState({targets: json.d, htargets: json.h});
                this.message("Successfully loaded targets", "text-success");
            },

            error: function(){
                this.message("API request error while loading targets", "text-error");
            },

            complete: function(){
                this.setState({inprogress: false});
            }
        });
    }

    requestState() {
        if(!this.props.auth)
            return;

        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/get",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {d: this.props.name},

            success: function(json){
                this.setState({vars: json.d});
            },

            error: function(){
                this.message("API request error while loading state", "text-error");
            },

            complete: function(){
                this.setState({inprogress: false});
                clearTimeout(this.timer);

                if (this.state.show)
                    this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        var cmd = 'cmd';
        var data = {d: device, c: command};

        this.message(command);
        this.setState({inprogress: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                this.message(json.ret + ' ' + command, 'text-success');
                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.message("API request error: " + device + ' ' + command, 'text-danger');
            },

            complete: function(){
                this.setState({inprogress: false});
                this.requestState();
            }
        });
    }

    componentDidMount() {
        // this.requestState();
        // this.requestTargets();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.show != this.state.show)
            return true;

        if(nextProps.auth != this.props.auth)
            return true;

        if(!equal(this.state, nextState))
            return true;

        if(!equal(this.props.name, nextProps.name))
            return true;

        return false;
    }

    message(text, ctype="text-default") {
        var msg = text ? <span className={"pull-left " + ctype}>{text}</span> : null;

        this.setState({message: msg});
    }

    handleShow() {
        this.setState({show: true, message: null, target_selected: null});

        if (this.state.targets.length == 0)
            this.requestTargets();

        this.requestState();
    }

    handleHide() {
        this.setState({show: false});
        clearTimeout(this.timer);
    }

    showInfo(id) {
        for (var i = 0; i < this.state.targets.length; i++) {
            var tgt = this.state.targets[i];

            if (tgt[0] == id) {
                this.message(tgt[0] + ' / ' + tgt[1] + ' at ' + toSexa(tgt[2]/15, 'deg', false, ":", 3) + ' ' + toSexa(tgt[3], 'deg', true, ":", 2), 'text-success');
                return;
            }
        }

        this.message("Target not found: " + id, 'text-warning');
    }

    handleInfo() {
        var id = this.state.target_selected[0].id;
        // console.log('info', id);
        window.open(this.props.root + this.props.client.name + '/targets/' + id, '_blank');
    }

    handleQueue() {
        var id = this.state.target_selected[0].id;
        var t1 = this.state.time1 ? this.state.time1.unix() : "nan";
        var t2 = this.state.time2 ? this.state.time2.unix() : "nan";

        if (t1 || t2) {
            // console.log('queue_at ' + this.state.queue + ' ' + id + ' ' + t1 + ' ' + t2);
            this.sendCommand('queue_at ' + this.state.queue + ' ' + id + ' ' + t1 + ' ' + t2);
        } else {
            // console.log('queue', this.state.target_selected, this.state.queue);
            this.sendCommand('queue ' + this.state.queue + ' ' + id);
        }
    }

    handleQueueRemove(queue, id) {
        // console.log('remove', queue, id);
        this.sendCommand('remove ' + queue + ' ' + id);
    }

    handleQueueMove(queue, id1, id2) {
        // console.log('move', queue, id1, id2);
        this.sendCommand('move ' + queue + ' ' + id1 + ' ' + id2);
    }

    render() {
        var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};
        var vars = this.state.vars;

        var tlist = [];

        if (this.state.show) {
            for (var i = 0; i < this.state.targets.length; i++) {
                var tgt = this.state.targets[i];

                tlist.push({id: tgt[0], label: tgt[0] + ' / ' + tgt[1] + " " + tgt[4] });
            }
        }

        var queues = [];
        var queue_names = [];

        if (vars) {
            for (var qi = 0; qi < vars['queue_names'].length; qi++){
                var queue = (' ' + vars['queue_names'][qi]).slice(1);
                var targets = [];

                if (queue == 'simul')
                    continue;

                if (this.state.queue == null)
                    this.state.queue = queue;

                queue_names.push(queue);

                for (var ti = 0; ti < vars[queue+'_ids'].length; ti++){
                    var item = <>
                                 <span style={{minWidth: "10em", display: "inline-block"}}>
                                   <a href={this.props.root + this.props.client.name + '/targets/' + vars[queue+'_ids'][ti]} target='_blank'>{vars[queue+'_ids'][ti]}</a>
                                   {' / ' + vars[queue+'_names'][ti]}</span>
                                 <span style={{minWidth: "1em", display: "inline-block"}}/>
                                 <UnixTime time={vars[queue+'_start'][ti]}/>
                                 {'  -  '}
                                 <UnixTime time={vars[queue+'_end'][ti]}/>
                               </>;

                    targets.push(item);
                }

                queues.push(
                    <><h3 style={{margin: '0.5em'}}>{queue}</h3>
                      <ul className="list-group" style={{padding: "0.1em"}}>
                        {targets.map((d,i) => {
                            return <li className="list-group-item" key={i}>{d}
                                     <span className="pull-right">
                                       <span className="glyphicon glyphicon-chevron-up icon" title="Move up" onClick={this.handleQueueMove.bind(this, queue, i, i-1)}/>
                                       <span style={{marginLeft:"0.5em"}}/>
                                       <span className="glyphicon glyphicon-chevron-down icon" title="Move down" onClick={this.handleQueueMove.bind(this, queue, i, i+1)}/>
                                       <span style={{marginLeft:"0.5em"}}/>
                                       <span className="glyphicon glyphicon-remove icon" title="Remove from queue" onClick={this.handleQueueRemove.bind(this, queue, i)}/>
                                     </span>
                                   </li>;})}
                      </ul>
                    </>);
            }
        }

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>
              }
              {!this.props.activator &&
               <span className="glyphicon glyphicon-list-alt icon" onClick={() => this.handleShow()} title="Queues"/>
              }

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.handleHide()}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title ? this.props.title : "Queues : " + this.props.client.description}</Modal.Title>
                </Modal.Header>

                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  <ul className="list-group">
                    {queues.map((d,i) => {return <li style={{padding: "0.2em"}} className="list-group-item" key={i} >{d}</li>;})}
                  </ul>
                </Modal.Body>

                <Modal.Footer>
                  <FormGroup>
                    <InputGroup>
                      <InputGroup.Addon className="input-group-prepend">
                        <span className="input-group-text">Target:</span>
                      </InputGroup.Addon>

                      <Typeahead placeholder="Type ID or name to search for targets"
                                 multiple={false}
                                 selectHintOnEnter={true}
                                 flip={true}
                                 autoFocus={false}
                                 clearButton={true}
                                 isLoading={this.state.inprogress}

                                 onChange={(selected) => {
                                     // Handle selections...
                                     this.setState({target_selected: selected});
                                     if (selected && selected[0])
                                         this.showInfo(selected[0].id);
                                     else
                                         this.message(null);
                                 }}
                                 selected={this.state.target_selected}
                                 options={tlist}
                      />

                      <InputGroup.Button className="input-group-append">
                        <DropdownButton id="queue-list"  title="Select queue for targets"
                                        componentClass={InputGroup.Button}
                                        title={this.state.queue ? this.state.queue : "Queue"}
                                        onSelect={(selected) => {console.log(selected); this.setState({queue: selected});}}>
                          {queue_names.map((d,i) => {return <MenuItem eventKey={d} key={i} active={d == this.state.queue}>{d}</MenuItem>;})}
                        </DropdownButton>
                      </InputGroup.Button>

                      <InputGroup.Button className="input-group-append">
                        <Button title="Display target information in a new window"
                                disabled={this.state.target_selected == null}
                                className="btn-outline-secondary"
                                onClick={() => this.handleInfo()}>
                          Info
                        </Button>
                      </InputGroup.Button>

                      <InputGroup.Button className="input-group-append">
                        <Button title="Queue selected target"
                                disabled={this.state.target_selected == null}
                                className="btn-outline-secondary"
                                onClick={() => this.handleQueue()}>
                          Queue
                        </Button>
                      </InputGroup.Button>
                    </InputGroup>
                  </FormGroup>

                  <FormGroup>
                    <Row  style={{padding: 0, paddingLeft: "15px", paddingRight: "15px"}}>

                      <Col md={6}  style={{padding: 0}}>
                        <InputGroup>
                          <InputGroup.Addon className="input-group-prepend">
                            <span className="input-group-text">Start Time:</span>
                          </InputGroup.Addon>

                          <ReactDatePicker selected={this.state.time1} onChange={(time)=>this.setState({time1:fix(time)})}
                                           onChangeRaw={(x)=>{if(moment(x.target.value, 'YYYY-MM-DD HH:mm:ss ZZ').isValid()) this.setState({time1: moment(x.target.value, 'YYYY-MM-DD HH:mm:ss ZZ')});}}
                                           placeholderText=" --- " showTimeSelect dateFormat='YYYY-MM-DD HH:mm:ss ZZ'
                                           timeFormat='HH:mm:ss' disabledKeyboardNavigation
                                           className="form-control" popperPlacement="top-end" minDate={new Date()} />

                        </InputGroup>
                      </Col>

                      <Col md={6} style={{padding: 0}}>
                        <InputGroup>
                          <InputGroup.Addon className="input-group-prepend">
                            <span className="input-group-text">End Time:</span>
                          </InputGroup.Addon>

                          <ReactDatePicker selected={this.state.time2} onChange={(time)=>this.setState({time2:fix(time)})}
                                           onChangeRaw={(x)=>{if(moment(x.target.value, 'YYYY-MM-DD HH:mm:ss ZZ').isValid()) this.setState({time2: moment(x.target.value, 'YYYY-MM-DD HH:mm:ss ZZ')});}}
                                           placeholderText=" --- " showTimeSelect dateFormat='YYYY-MM-DD HH:mm:ss ZZ'
                                           timeFormat='HH:mm:ss' disabledKeyboardNavigation
                                           className="form-control" popperPlacement="top-end" minDate={new Date()} />

                        </InputGroup>
                      </Col>

                    </Row>
                  </FormGroup>
                  {this.state.message ? this.state.message : ""}

                  <Button bsStyle="default" onClick={() => this.handleHide()}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

function fix(time) {
    var newtime = time;
    newtime.seconds(0);
    return newtime;
}

QueueModal.defaultProps = {refresh:"10000"};
QueueModal = ReactRedux.connect(mapStateToProps)(QueueModal);
