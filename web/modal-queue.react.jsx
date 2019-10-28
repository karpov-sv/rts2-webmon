// Queue variables
class QueueModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, targets: [], htargets: [], selectable: [], error: null, target_selected: null, message: null, queue: null, inprogress: false, vars: null, time1: null, time2: null, autoOpen: false};
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

    requestSelectable() {
        if(!this.props.auth)
            return;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/tslist",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {b: 1},

            success: function(json){
                this.setState({selectable: json.d});
            },

            error: function(){
                this.message("API request error while loading selectable targets", "text-error");
            },

            complete: function(){
                clearTimeout(this.stimer);

                if (this.state.show)
                    this.stimer = setTimeout($.proxy(this.requestSelectable, this), this.props.refresh);
            }
        });
    }

    sendCommandEx(cmd, data) {
        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                if (json.ret == 0)
                    this.message(json.ret + ' ' + cmd, 'text-success');
                else if (json.ret != null)
                    this.message(json.ret + ' ' + cmd + ' ' + JSON.stringify(data), 'text-danger');

                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.message("API request error: " + cmd + " " + JSON.stringify(data), 'text-danger');
            },

            complete: function(){
                this.requestState();
                this.requestSelectable();
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        this.message(command);
        this.sendCommandEx('cmd', {d: device, c: command});
    }

    componentDidMount() {
        if (this.state.show) {
            this.requestState();
            this.requestTargets();
            this.requestSelectable();
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
        clearTimeout(this.stimer);
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
        this.setState({show: true, message: null, target_selected: null, autoOpen: false});

        if (this.state.targets.length == 0)
            this.requestTargets();

        this.requestState();
        this.requestSelectable();
    }

    handleHide() {
        this.setState({show: false});
        clearTimeout(this.timer);
        clearTimeout(this.stimer);
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
        window.open(this.props.root + this.props.client.name + '/targets/' + id, '_blank');
    }

    handleQueue() {
        var id = this.state.target_selected[0].id;
        var t1 = this.state.time1 ? this.state.time1.unix() : "nan";
        var t2 = this.state.time2 ? this.state.time2.unix() : "nan";

        if (t1 || t2) {
            this.sendCommand('queue_at ' + this.state.queue + ' ' + id + ' ' + t1 + ' ' + t2);
        } else {
            this.sendCommand('queue ' + this.state.queue + ' ' + id);
        }
    }

    handleQueueRemove(queue, id) {
        this.sendCommand('remove ' + queue + ' ' + id);
    }

    handleQueueMove(queue, id1, id2) {
        this.sendCommand('move ' + queue + ' ' + id1 + ' ' + id2);
    }

    handleTargetDisable(id) {
        this.sendCommandEx('update_target', {id: id, enabled: 0});
    }

    handleTargetEnable(id) {
        this.sendCommandEx('update_target', {id: id, enabled: 1});
    }

    handleTargetRestart(id) {
        this.sendCommandEx('update_target', {id: id, next_observable: 0});
    }

    handleTargetPostpone(id, delay) {
        this.sendCommandEx('update_target', {id: id, next_observable: now() + delay});
    }

    handleTargetPriority(id, priority) {
        this.sendCommandEx('update_target', {id: id, priority: priority});
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
            // Normal queues
            for (var qi = 0; qi < vars['queue_names'].length; qi++){
                var queue = (' ' + vars['queue_names'][qi]).slice(1);
                var targets = [];

                if (queue == 'simul')
                    continue;

                if (this.state.queue == null)
                    this.state.queue = queue;

                if (!vars[queue+'_ids'].length)
                    continue;

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
                    <><h3 style={{margin: '0.2em'}}>{queue}</h3>
                      {targets.length > 0 &&
                       <ul className="list-group" style={{padding: "0.1em", margin: "0.1em"}}>
                         {targets.map((d,i) => {
                             return <li className="list-group-item" key={i} style={{padding: "5px 5px"}}>{d}
                                      <span className="pull-right">
                                        <span className="glyphicon glyphicon-chevron-up icon" title="Move up" style={{marginLeft:"0.5em"}} onClick={this.handleQueueMove.bind(this, queue, i, i-1)}/>
                                        <span className="glyphicon glyphicon-chevron-down icon" title="Move down" style={{marginLeft:"0.5em"}} onClick={this.handleQueueMove.bind(this, queue, i, i+1)}/>
                                        <span className="glyphicon glyphicon-remove icon" title="Remove from queue" style={{marginLeft:"0.5em"}} onClick={this.handleQueueRemove.bind(this, queue, i)}/>
                                      </span>
                                    </li>;})}
                       </ul>
                      }
                    </>);
            }

            // Selectable/enabled targets
            var stargets = [];
            for (var ti = 0; ti < this.state.selectable.length; ti++){
                var t = this.state.selectable[ti];
                var color = "black";

                if (t[7] > now ())
                    color = "gray";

                var item = <span style={{color: color}}>
                             <span style={{minWidth: "5em", marginRight: "1em", display: "inline-block"}}>
                               <a href={this.props.root + this.props.client.name + '/targets/' + t[0]} target='_blank'>{t[0]}</a>
                             </span>
                             <span style={{minWidth: "4em", marginRight: "1em", display: "inline-block"}} title={"Priority " + t[6]}>
                               <EditableValue value={t[5] ? t[5].toFixed(1) : '-'} evalue={t[6]} onChange={this.handleTargetPriority.bind(this, t[0])}/>
                             </span>
                             <span style={{marginRight: "1em", display: "inline-block"}}>
                               {t[1]}
                             </span>

                               {t[7] > now () &&
                                <span className="text-right">
                                  <span className="glyphicon glyphicon-hourglass" style={{marginRight: "0.2em"}}/>
                                  <UnixTime time={t[7]}/>
                                </span>
                               }
                           </span>;

                stargets.push(item);
            }
            queues.push(
                <><h3 style={{margin: '0.2em'}} onClick={()=>this.setState({autoOpen: !this.state.autoOpen})}>
                    Automatic selector
                    {this.state.autoOpen ?
                     <span className="caret rotate-180"/> :
                     <span className="caret"/>}
                  </h3>
                  <Collapse in={this.state.autoOpen}>
                    <div>
                      {stargets.length > 0 &&
                       <ul className="list-group" style={{padding: "0.1em", margin: "0.1em"}}>
                         {stargets.map((d,i) => {
                             return <li className="list-group-item" key={i} style={{padding: "5px 5px"}}>{d}
                                      <span className="pull-right">
                                        <span className="glyphicon glyphicon-ok icon" title="Reset" style={{marginLeft:"0.5em"}} onClick={this.handleTargetRestart.bind(this, this.state.selectable[i][0])}/>
                                        <span className="glyphicon glyphicon-ban-circle icon" title="Postpone for 1 hour" style={{marginLeft:"0.5em"}} onClick={this.handleTargetPostpone.bind(this, this.state.selectable[i][0], 3600)}/>
                                        <span className="glyphicon glyphicon-remove icon" title="Disable" style={{marginLeft:"0.5em"}} onClick={this.handleTargetDisable.bind(this, this.state.selectable[i][0])}/>
                                      </span>
                                    </li>;})}
                       </ul>
                      }
                    </div>
                  </Collapse>
                </>);

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
                  {queues.map((d,i) => {return <div style={{padding: "0.2em"}} key={i} >{d}</div>;})}
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
                        <Button title="Enable target for automatic scheduling"
                                disabled={this.state.target_selected == null}
                                className="btn-outline-secondary"
                                onClick={() => this.handleTargetEnable(this.state.target_selected[0].id)}>
                          Enable
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
