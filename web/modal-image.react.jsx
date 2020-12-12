// Generic pop-up image preview, with optional reload
class ImageModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {src: props.src, rsrc: props.src, show: false};
        this.interval = null;
    }

    render() {
        return (
            <>
              {/* Activator element */}
              <span onClick={() => this.setState({show: true})}>
                {this.props.activator}
              </span>

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <img className="img img-responsive center-block" src={this.state.rsrc} onClick={()=>window.open(this.state.src, '_blank')}/>
                </Modal.Body>
                <Modal.Footer>
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
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

ImageModal.defaultProps = {refresh:"5000"};
ImageModal = ReactRedux.connect(mapStateToProps)(ImageModal);
